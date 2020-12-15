/* Auto generated by Gybson (https://github.com/MattGson/Gybson) --- DO NOT MODIFY */

/* eslint-disable */

import DataLoader = require('dataloader');
import { schema } from '../Gen/gybson.schema';

import {
    SQLQueryBuilder,
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
} from '../../src/Client';

import { postsRelationFilter } from '../Gen/Posts';
import { team_membersRelationFilter } from '../Gen/TeamMembers';
import { first, groupBy } from 'lodash';
import { logger } from '../../src/Client/lib/logging';

export type users_permissions = 'ADMIN' | 'USER';
export type users_subscription_level = 'BRONZE' | 'GOLD' | 'SILVER';

export interface usersDTO {
    user_id: number;
    best_friend_id: number | null;
    email: string;
    first_name: string | null;
    last_name: string | null;
    password: string;
    token: string | null;
    permissions: users_permissions | null;
    subscription_level: users_subscription_level | null;
    deleted_at: Date | null;
}

export interface usersRequiredRow {
    user_id?: number;
    best_friend_id?: number | null;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    password: string;
    token?: string | null;
    permissions?: users_permissions | null;
    subscription_level?: users_subscription_level | null;
    deleted_at?: Date | null;
}

export interface usersColumnMap {
    user_id: boolean;
    best_friend_id: boolean;
    email: boolean;
    first_name: boolean;
    last_name: boolean;
    password: boolean;
    token: boolean;
    permissions: boolean;
    subscription_level: boolean;
    deleted_at: boolean;
}

export interface usersRelationFilter {
    existsWhere?: usersWhere;
    notExistsWhere?: usersWhere;
    whereEvery?: usersWhere;
}

export interface usersWhere {
    user_id?: number | NumberWhere;
    best_friend_id?: number | NumberWhereNullable | null;
    email?: string | StringWhere;
    first_name?: string | StringWhereNullable | null;
    last_name?: string | StringWhereNullable | null;
    password?: string | StringWhere;
    token?: string | StringWhereNullable | null;
    permissions?: users_permissions | null;
    subscription_level?: users_subscription_level | null;
    deleted_at?: Date | DateWhereNullable | null;

    AND?: Enumerable<usersWhere>;
    OR?: Enumerable<usersWhere>;
    NOT?: Enumerable<usersWhere>;

    best_friend?: usersRelationFilter | null;
    author_posts?: postsRelationFilter | null;
    co_author_posts?: postsRelationFilter | null;
    team_members?: team_membersRelationFilter | null;
    users?: usersRelationFilter | null;
}

export interface usersLoadOne {
    user_id?: number | NumberWhere;
    email?: string | StringWhere;
    token?: string | StringWhereNullable | null;

    best_friend?: usersRelationFilter | null;
    author_posts?: postsRelationFilter | null;
    co_author_posts?: postsRelationFilter | null;
    team_members?: team_membersRelationFilter | null;
    users?: usersRelationFilter | null;
}

export type usersOrderBy = {
    user_id?: Order;
    best_friend_id?: Order;
    email?: Order;
    first_name?: Order;
    last_name?: Order;
    password?: Order;
    token?: Order;
    permissions?: Order;
    subscription_level?: Order;
    deleted_at?: Order;
};

export interface usersPaginate {
    limit?: number;
    afterCursor?: Partial<usersDTO>;
    beforeCursor?: Partial<usersDTO>;
    offset?: number;
}

export interface Loader {
    keyFunc: (user: usersDTO) => string;
}

export default class Users extends SQLQueryBuilder<
    usersDTO,
    usersColumnMap,
    usersWhere,
    usersOrderBy,
    usersPaginate,
    usersRequiredRow
> {
    constructor() {
        super({
            tableName: 'users',
            schema,
        });
    }

    // an object safe cache key function
    // utilises the fact that object.values order is
    private static cacheKey(k: Partial<usersDTO>): string {
        return Object.values(k).join(':');
    }

    private static loaderOptions() {
        return { cacheKeyFn: (k: Partial<usersDTO>) => Users.cacheKey(k) };
    }

    private loadSingles(keys: readonly any[]) {
        return this.byCompoundColumnLoader({ keys });
    }

    private loadMulti(keys: readonly any[]) {
        const [{ orderBy }] = keys;
        const order = { ...orderBy }; // copy to retain
        keys.map((k) => delete k.orderBy); // remove key so its not included as a load param
        // apply the first ordering to all - may need to change data loader to execute multiple times for each ordering specified
        return this.manyByCompoundColumnLoader({ keys, orderBy: order });
    }

    // TODO:- v1 map of loaders (can easily seed and purge)
    //  Problem: - number of entries explodes based on load angles (what if we add relation load angles?)

    // private readonly oneLoaders: { [key: string]: DataLoader<any, usersDTO | null> } = {
    //     email: new DataLoader<Partial<usersDTO>, usersDTO | null, string>(
    //         (keys) => this.loadSingles(keys),
    //         Users.loaderOptions(),
    //     ),
    //     user_id: new DataLoader<Partial<usersDTO>, usersDTO | null, string>(
    //         (keys) => this.byCompoundColumnLoader({ keys }),
    //         Users.loaderOptions(),
    //     ),
    // };
    //
    // private readonly manyLoaders: { [key: string]: DataLoader<any, usersDTO[]> } = {
    //     best_friend_id: new DataLoader<Partial<usersDTO> & { orderBy?: usersOrderBy }, usersDTO[], string>(
    //         (keys) => this.loadMulti(keys),
    //         Users.loaderOptions(),
    //     ),
    // };

    // public async loadOne(params: Partial<usersDTO> & { includeDeleted?: boolean }) {
    //     const loadKey = Object.keys(params).sort().join(':');
    //     const loader = this.oneLoaders[loadKey];
    //     let { includeDeleted, ...rest } = params;
    //     let row: usersDTO | null;
    //     if (!loader) {
    //         logger().warn(`No loader for key ${loadKey}. Will not batch`);
    //         row = first(await this.loadSingles([params])) || null;
    //     } else {
    //         row = await loader.load(rest);
    //     }
    //     if (row?.deleted_at && !params.includeDeleted) return null;
    //     return row;
    // }
    // public async loadMulti(... map() => loadOne()...) {}


    // TODO:- option 2 - single DL that groups keys together based on load angle
    //    Problem - how to group?

    private readonly combinedOneLoader = new DataLoader<
        Partial<usersDTO> & { orderBy?: usersOrderBy },
        usersDTO[],
        string
    >((keys) => {
        // group loads by key tuples
        const loadAngles = groupBy(keys, k => Object.keys(k).sort().join(':'));
        // TODO:
        //  - Build a map from keys -> results in order
        const loads = Object.entries(loadAngles).map(([k, v]) => {
            return this.loadSingles(v);
        })


        // return this.loadMulti(keys)
    }, Users.loaderOptions());
    // TODO:- slightly unrelated but:
    //  Re: Relation loads
    //  How will compoundColumnLoaders re-order? Will need to actually select the related column for N - 1?
    //

    //
    // private readonly byEmailLoader = new DataLoader<{ email: string }, usersDTO | null, string>(
    //     (keys) => {
    //         return this.byCompoundColumnLoader({ keys });
    //     },
    //     {
    //         cacheKeyFn: (k) => Object.values(k).join(':'),
    //     },
    // );
    //
    // public async oneByEmail(params: { email: string; includeDeleted?: boolean }) {
    //     const { email } = params;
    //     const row = await this.byEmailLoader.load({ email });
    //     if (row?.deleted_at && !params.includeDeleted) return null;
    //     return row;
    // }
    //
    // private readonly byTokenLoader = new DataLoader<{ token: string }, usersDTO | null, string>(
    //     (keys) => {
    //         return this.byCompoundColumnLoader({ keys });
    //     },
    //     {
    //         cacheKeyFn: (k) => Object.values(k).join(':'),
    //     },
    // );
    //
    // public async oneByToken(params: { token: string; includeDeleted?: boolean }) {
    //     const { token } = params;
    //     const row = await this.byTokenLoader.load({ token });
    //     if (row?.deleted_at && !params.includeDeleted) return null;
    //     return row;
    // }
    //
    // private readonly byUserIdLoader = new DataLoader<{ user_id: number }, usersDTO | null, string>(
    //     (keys) => {
    //         return this.byCompoundColumnLoader({ keys });
    //     },
    //     {
    //         cacheKeyFn: (k) => Object.values(k).join(':'),
    //     },
    // );
    //
    // public async oneByUserId(params: { user_id: number; includeDeleted?: boolean }) {
    //     const { user_id } = params;
    //     const row = await this.byUserIdLoader.load({ user_id });
    //     if (row?.deleted_at && !params.includeDeleted) return null;
    //     return row;
    // }
    //
    // private readonly byBestFriendIdLoader = new DataLoader<
    //     { best_friend_id: number; orderBy?: usersOrderBy },
    //     usersDTO[],
    //     string
    // >(
    //     (keys) => {
    //         const [{ orderBy }] = keys;
    //         const order = { ...orderBy }; // copy to retain
    //         keys.map((k) => delete k.orderBy); // remove key so its not included as a load param
    //         // apply the first ordering to all - may need to change data loader to execute multiple times for each ordering specified
    //         return this.manyByCompoundColumnLoader({ keys, orderBy: order });
    //     },
    //     {
    //         cacheKeyFn: (k) => Object.values(k).join(':'),
    //     },
    // );
    //
    // public async manyByBestFriendId(params: {
    //     best_friend_id: number;
    //     includeDeleted?: boolean;
    //     orderBy?: usersOrderBy;
    // }) {
    //     const { best_friend_id, orderBy } = params;
    //     const rows = await this.byBestFriendIdLoader.load({ best_friend_id, orderBy });
    //
    //     if (params.includeDeleted) return rows;
    //     return rows.filter((row) => !row.deleted_at);
    // }
}
