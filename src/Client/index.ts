import Knex = require('knex');
import { attachOnDuplicateUpdate } from './lib/knex.duplicate.key';
import { attachOnConflictUpdate } from './lib/knex.conflict';
import { buildLogger, LogLevel } from './lib/logging';
import { ConnectionOptions } from 'tls';

attachOnDuplicateUpdate();
attachOnConflictUpdate();

//
// INTERNAL USE
//
export { SQLQueryBuilder } from './QueryBuilders/SQLQueryBuilder';
export * from '../TypeTruth/TypeTruth';

const state: { knex: Knex<any, unknown[]> | undefined; engine: 'pg' | 'mysql' } = {
    knex: undefined,
    engine: 'pg',
};

export const knex = () => {
    if (!state.knex) throw new Error('Gybson must be configured with a knex instance');
    return state.knex;
};

export const engine = () => state.engine;

//
// EXTERNAL USE
//
export { transaction } from './QueryBuilders/Transaction';
export { LogLevel } from './lib/logging';
export interface GybsonConfig {
    logLevel?: LogLevel;
}

export interface MYSQLConnection {
    host?: string;
    port?: number;
    localAddress?: string;
    socketPath?: string;
    user?: string;
    password?: string;
    database?: string;
    charset?: string;
    timezone?: string;
    connectTimeout?: number;
    stringifyObjects?: boolean;
    insecureAuth?: boolean;
    typeCast?: any;
    queryFormat?: (query: string, values: any) => string;
    supportBigNumbers?: boolean;
    bigNumberStrings?: boolean;
    dateStrings?: boolean;
    debug?: boolean;
    trace?: boolean;
    multipleStatements?: boolean;
    flags?: string;
    ssl?: string;
    decimalNumbers?: boolean;
}

export interface PostgresConnection {
    user?: string;
    database?: string;
    password?: string;
    port?: number;
    host?: string;
    connectionString?: string;
    keepAlive?: boolean;
    statement_timeout?: false | number;
    connectionTimeoutMillis?: number;
    keepAliveInitialDelayMillis?: number;
    ssl?: boolean | ConnectionOptions;
}

const init = (config: {
    client: 'mysql' | 'pg';
    connection?: MYSQLConnection | PostgresConnection;
    options?: GybsonConfig;
}) => {
    const useConfig = {
        logLevel: config.options?.logLevel || LogLevel.info,
    };
    const logger = buildLogger(useConfig);

    state.knex = Knex({
        client: config.client,
        connection: config.connection,
    });
    state.engine = config.client;
    logger.info('Initialising Gybson...');
};

const close = () => {
    if (state.knex) state.knex.destroy();
    console.log('Gybson connection closed');
};

export default {
    init,
    close,
};
