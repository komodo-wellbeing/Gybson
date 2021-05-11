/* Auto generated by relational-schema (https://github.com/MattGson/relational-schema) --- DO NOT MODIFY */

/* eslint-disable */

import { ClientEngine } from '../../src/query-client';
import schema from './relational-schema';
import Knex from 'knex';
import winston from 'winston';

import {
    QueryClient,
    Order,
    Enumerable,
    NumberWhere,
    NumberWhereNullable,
    StringWhere,
    StringWhereNullable,
    BooleanWhere,
    BooleanWhereNullable,
    DateWhere,
    DateWhereNullable,
    Loader,
} from '../../src/query-client';

import { userRelationFilter } from './Users';
import { team_memberRelationFilter } from './TeamMembers';

export interface postDTO {
    post_id: number;
    author: string;
    author_id: number;
    co_author: number | null;
    message: string;
    rating_average: number | null;
    created: Date | null;
    deleted: boolean | null;
}

export interface postRequiredRow {
    post_id?: number;
    author: string;
    author_id: number;
    co_author?: number | null;
    message: string;
    rating_average?: number | null;
    created?: Date | null;
    deleted?: boolean | null;
}

export interface postColumnMap {
    post_id: boolean;
    author: boolean;
    author_id: boolean;
    co_author: boolean;
    message: boolean;
    rating_average: boolean;
    created: boolean;
    deleted: boolean;
}

export interface postRelationFilter {
    existsWhere?: postWhere;
    notExistsWhere?: postWhere;
    whereEvery?: postWhere;
}

export interface postWhere {
    post_id?: number | NumberWhere;
    author?: string | StringWhere;
    author_id?: number | NumberWhere;
    co_author?: number | NumberWhereNullable | null;
    message?: string | StringWhere;
    rating_average?: number | NumberWhereNullable | null;
    created?: Date | DateWhereNullable | null;
    deleted?: boolean | BooleanWhereNullable | null;

    AND?: Enumerable<postWhere>;
    OR?: Enumerable<postWhere>;
    NOT?: Enumerable<postWhere>;

    author_relation?: userRelationFilter | null;
    co_author_relation?: userRelationFilter | null;
    team_members?: team_memberRelationFilter | null;
}

export interface postLoadOneWhere {
    post_id?: number;
}

export interface postLoadManyWhere {
    author?: string;
    author_id?: number;
    co_author?: number | null;
    message?: string;
    rating_average?: number | null;
    created?: Date | null;
    deleted?: boolean | null;
}

export type postOrderBy = {
    post_id?: Order;
    author?: Order;
    author_id?: Order;
    co_author?: Order;
    message?: Order;
    rating_average?: Order;
    created?: Order;
    deleted?: Order;
};

export interface postPaginate {
    limit?: number;
    afterCursor?: Partial<postDTO>;
    beforeCursor?: Partial<postDTO>;
    offset?: number;
}

export default class Posts extends QueryClient<
    postDTO,
    postColumnMap,
    postWhere,
    postLoadOneWhere,
    postLoadManyWhere,
    postOrderBy,
    postPaginate,
    postRequiredRow
> {
    constructor(params: { knex: Knex<any, unknown>; logger: winston.Logger; engine: ClientEngine }) {
        const { knex, logger, engine } = params;
        super({
            tableName: 'posts',
            schema: schema as any,
            knex,
            logger,
            engine,
        });
    }
}
