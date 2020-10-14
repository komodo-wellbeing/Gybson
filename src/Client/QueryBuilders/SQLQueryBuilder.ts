import { DatabaseSchema, knex } from '../index';
import { logger } from '../lib/logging';
import _ from 'lodash';
import { WhereResolver } from './WhereResolver';
import { OrderBy, Paginate } from '../../TypeTruth/TypeTruth';
import { Transaction } from 'knex';
import { Connection as PGConn } from 'pg-promise/typescript/pg-subset';
import { Connection as MySQLConn } from 'promise-mysql';
type Connection = PGConn | MySQLConn;

export abstract class SQLQueryBuilder<
    TblRow,
    TblColumnMap,
    TblWhere,
    TblOrderBy extends OrderBy,
    TblPaginate extends Paginate,
    PartialTblRow = Partial<TblRow>
> {
    private tableName: string;
    private tableAlias: string;
    private softDeleteColumn?: string;
    private schema: DatabaseSchema;

    protected constructor(params: { tableName: string; softDeleteColumn?: string; schema: DatabaseSchema }) {
        this.tableName = params.tableName;
        this.softDeleteColumn = params.softDeleteColumn;
        this.schema = params.schema;
        this.tableAlias = `${this.tableName}_q_root`;
    }

    private hasSoftDelete(): boolean {
        return this.softDeleteColumn != null;
    }

    private get aliasedSoftDeleteColumn(): string {
        return `${this.aliasedColumn(this.softDeleteColumn as string)}`;
    }

    private get aliasedTable(): string {
        return `${this.tableName} as ${this.tableAlias}`;
    }

    private aliasedColumn(column: string) {
        return `${this.tableAlias}.${column}`;
    }

    /**
     * Load multiple rows for each input compound key
     * make use of the tuple style WHERE IN clause i.e. WHERE (user_id, post_id) IN ((1,2), (2,3))
     * @param params.keys - the load key i.e. { user_id: 3, post_id: 5 }[]
     */
    protected async manyByCompoundColumnLoader(params: {
        keys: readonly PartialTblRow[];
        orderBy?: TblOrderBy;
    }): Promise<TblRow[][]> {
        const { keys, orderBy } = params;

        // get the key columns to load on
        const columns = Object.keys(keys[0]);

        // Need to make sure order of values matches order of columns in WHERE i.e. { user_id: 3, post_id: 5 } -> [user_id, post_id], [3, 5]
        const loadValues = keys.map<(string | number)[]>((k) => {
            // @ts-ignore
            return columns.map((col) => k[col]);
        });

        // build query
        let query = knex()(this.tableName).select().whereIn(columns, loadValues);

        if (orderBy) {
            for (let [column, direction] of Object.entries(orderBy)) {
                query.orderBy(column, direction);
            }
        }

        logger().debug('Executing loading: %s with keys %j', query.toSQL().sql, loadValues);

        const rows = await query;

        // join multiple keys into a unique string to allow mapping to dictionary
        // again map columns to make sure order is preserved
        // @ts-ignore
        const sortKeys = keys.map((k) => columns.map((col) => k[col]).join(':'));

        // map rows back to input keys ensuring order is preserved
        const grouped = _.groupBy(rows, (row) => columns.map((col) => row[col]).join(':'));
        return sortKeys.map((key) => grouped[key] || []);
    }

    /**
     * Load a single row for each input compound key
     * make use of the tuple style WHERE IN clause i.e. WHERE (user_id, post_id) IN ((1,2), (2,3))
     * @param params.keys - the load key i.e. { user_id: 3, post_id: 5 }[]
     */
    protected async byCompoundColumnLoader(params: { keys: readonly PartialTblRow[] }): Promise<(TblRow | null)[]> {
        const { keys } = params;

        // get the key columns to load on
        const columns = Object.keys(keys[0]);

        // Need to make sure order of values matches order of columns in WHERE i.e. { user_id: 3, post_id: 5 } -> [user_id, post_id], [3, 5]
        const loadValues = keys.map<(string | number)[]>((k) => {
            // @ts-ignore
            return columns.map((col) => k[col]);
        });

        let query = knex()(this.tableName).select().whereIn(columns, loadValues);

        logger().debug('Executing loading: %s with keys %j', query.toSQL().sql, loadValues);

        const rows = await query;

        // join multiple keys into a unique string to allow mapping to dictionary
        // again map columns to make sure order is preserved
        // @ts-ignore
        const sortKeys = keys.map((k) => columns.map((col) => k[col]).join(':'));
        // map rows to dictionary against the same key strings - again preserving key order
        const keyed = _.keyBy(rows, (row) => columns.map((col) => row[col]).join(':'));

        // map rows back to key order
        return sortKeys.map((k) => {
            if (keyed[k]) return keyed[k];
            logger().debug(`Missing row for ${this.tableName}, columns: ${columns.join(':')}, key: ${k}`);
            return null;
        });
    }

    /**
     * Find rows from a table
     * Supports filtering, ordering, pagination
     * @param params
     */
    public async findMany(params: {
        where?: TblWhere;
        paginate?: TblPaginate;
        orderBy?: TblOrderBy;
        includeDeleted?: boolean;
    }): Promise<TblRow[]> {
        const { orderBy, paginate, where, includeDeleted } = params;
        let query = knex()(this.aliasedTable).select(`${this.tableAlias}.*`);

        if (where) {
            WhereResolver.resolveWhereClause({
                where,
                queryBuilder: query,
                schema: this.schema,
                tableName: this.tableName,
                tableAlias: this.tableAlias,
            });
        }

        if (!includeDeleted && this.hasSoftDelete()) query.where({ [this.aliasedSoftDeleteColumn]: false });

        if (orderBy) {
            for (let [column, direction] of Object.entries(orderBy)) {
                query.orderBy(this.aliasedColumn(column), direction);
            }
        }

        if (paginate) {
            const { limit, afterCursor, beforeCursor, offset } = paginate;

            if (limit) query.limit(limit);
            if (offset) query.offset(offset);
            if (afterCursor) {
                Object.entries(afterCursor).forEach(([column, value]) => {
                    query.where(this.aliasedColumn(column), '>', value);
                });
            }
            if (beforeCursor) {
                Object.entries(beforeCursor).forEach(([column, value]) => {
                    query.where(this.aliasedColumn(column), '<', value);
                });
            }
        }

        if (paginate && paginate.afterCursor && orderBy) {
            for (let key of Object.keys(paginate.afterCursor)) {
                if (!orderBy[key])
                    logger().warn(
                        'You are ordering by different keys to your cursor. This may lead to unexpected results',
                    );
            }
        }

        logger().debug('Executing findMany: %s', query.toSQL().sql);
        return query;
    }
    /**
     * Upsert function
     * Inserts all rows. If duplicate key then will update specified columns for that row.
     *     * Pass a constant column (usually primary key) to ignore duplicates without updating any rows.
     * Can automatically remove soft deletes if desired instead of specifying the column and values manually.
     *     * This should be set to false if the table does not support soft deletes
     * Will replace undefined keys or values with DEFAULT which will use a default column value if available.
     * Will take the superset of all columns in the insert values
     * @param params
     */
    public async upsert(params: {
        transact?: Transaction;
        connection?: Connection;
        values: PartialTblRow | PartialTblRow[];
        reinstateSoftDeletedRows?: boolean;
        updateColumns: Partial<TblColumnMap>;
    }): Promise<number> {
        const { values, transact, connection, reinstateSoftDeletedRows, updateColumns } = params;

        const columnsToUpdate: string[] = [];
        for (let [column, update] of Object.entries(updateColumns)) {
            if (update) columnsToUpdate.push(column);
        }

        let insertRows: PartialTblRow[];
        if (Array.isArray(values)) insertRows = values;
        else insertRows = [values];

        if (insertRows.length < 1) {
            throw new Error('Upsert: No values passed.');
        }
        if (columnsToUpdate.length < 1 && !reinstateSoftDeletedRows) {
            throw new Error('Upsert: No reinstateSoftDelete nor updateColumns. Use insert.');
        }

        // add deleted column to all records
        if (reinstateSoftDeletedRows && this.hasSoftDelete()) {
            columnsToUpdate.push(this.softDeleteColumn as string);
            insertRows = insertRows.map((value) => {
                return {
                    ...value,
                    [this.softDeleteColumn as string]: false,
                };
            });
        }

        // Knex Normalizes empty (undefined) keys to DEFAULT on multi-row insert:
        // knex('coords').insert([{x: 20}, {y: 30},  {x: 10, y: 20}])
        // Outputs:
        //    insert into `coords` (`x`, `y`) values (20, DEFAULT), (DEFAULT, 30), (10, 20)
        // Note that we are passing a custom connection:
        //    This connection MUST be added last to work with the duplicateUpdateExtension
        const query = knex()(this.tableName)
            .insert(insertRows)
            .onDuplicateUpdate(...columnsToUpdate);

        if (connection) query.connection(connection);
        if (transact) query.transacting(transact);

        logger().debug('Executing upsert: %s with values: %j', query.toSQL().sql, insertRows);
        const result = await query;

        return result[0].insertId;
    }

    /**
     * Insert function
     * Inserts all rows. Fails on duplicate key error
     *     * use upsert if you wish to ignore duplicate rows
     * Will replace undefined keys or values with DEFAULT which will use a default column value if available.
     * Will take the superset of all columns in the insert values
     * @param params
     */
    public async insert(params: {
        transact?: Transaction;
        connection?: Connection;
        values: PartialTblRow | PartialTblRow[];
    }): Promise<number> {
        const { values, transact, connection } = params;

        let insertRows: PartialTblRow[];
        if (Array.isArray(values)) insertRows = values;
        else insertRows = [values];

        if (insertRows.length < 1) {
            throw new Error('Insert: No values passed.');
        }

        // TODO:- add or fake returning() to support postgres style result return
        let query = knex()(this.tableName).insert(values);
        if (connection) query.connection(connection);
        if (transact) query.transacting(transact);

        logger().debug('Executing insert: %s with values: %j', query.toSQL().sql, values);
        const result = await query;
        // seems to return 0 for non-auto-increment inserts
        return result[0];
    }

    /**
     * Soft delete
     * Deletes all rows matching conditions i.e. WHERE a = 1 AND b = 2;
     * @param params
     */
    public async softDelete(params: { transact?: Transaction; connection?: Connection; where: TblWhere }) {
        const { where, transact, connection } = params;
        if (!this.hasSoftDelete()) throw new Error(`Cannot soft delete for table: ${this.tableName}`);
        if (Object.keys(where).length < 1) throw new Error('Must have at least one where condition');

        const query = knex()(this.aliasedTable).update({ [this.aliasedSoftDeleteColumn]: true });

        WhereResolver.resolveWhereClause({
            queryBuilder: query,
            where,
            schema: this.schema,
            tableName: this.tableName,
            tableAlias: this.tableAlias,
        });

        if (transact) query.transacting(transact);
        if (connection) query.connection(connection);

        logger().debug('Executing soft delete: %s', query.toSQL().sql);

        return query;
    }

    /**
     * Delete
     * Deletes all rows matching conditions i.e. WHERE a = 1 AND b = 2;
     * @param params
     */
    public async delete(params: { transact?: Transaction; connection?: Connection; where: TblWhere }) {
        const { where, transact, connection } = params;
        if (this.hasSoftDelete())
            logger().warn(`Running delete for table: "${this.tableName}" which has a soft delete column`);
        if (Object.keys(where).length < 1) throw new Error('Must have at least one where condition');

        const query = knex()(this.tableName).del();

        // Note - can't use an alias with delete statement in knex
        WhereResolver.resolveWhereClause({
            queryBuilder: query,
            where,
            schema: this.schema,
            tableName: this.tableName,
            tableAlias: this.tableName,
        });
        if (connection) query.connection(connection);
        if (transact) query.transacting(transact);

        logger().debug('Executing delete: %s', query.toSQL().sql);

        return query;
    }

    /**
     * Update
     * Updates all rows matching conditions i.e. WHERE a = 1 AND b = 2;
     */
    public async update(params: {
        transact?: Transaction;
        connection?: Connection;
        values: PartialTblRow;
        where: TblWhere;
    }) {
        const { values, transact, connection, where } = params;
        if (Object.keys(values).length < 1) throw new Error('Must have at least one updated column');
        if (Object.keys(where).length < 1) throw new Error('Must have at least one where condition');

        // @ts-ignore - PartialTblRow extends object
        const aliasedValues = _.mapKeys(values, (_val, col: string) => this.aliasedColumn(col));

        const query = knex()(this.aliasedTable).update(aliasedValues);
        WhereResolver.resolveWhereClause({
            queryBuilder: query,
            where,
            schema: this.schema,
            tableName: this.tableName,
            tableAlias: this.tableAlias,
        });
        if (connection) query.connection(connection);
        if (transact) query.transacting(transact);

        logger().debug('Executing update: %s with conditions %j and values %j', query.toSQL().sql, where, values);

        return query;
    }
}
