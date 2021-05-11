import { GybsonClient } from 'test/tmp';
import {
    buildDBSchemas,
    closeConnection,
    closePoolConnection,
    getPoolConnection,
    knex,
    seed,
    SeedIds,
    seedPost,
    seedUser,
} from 'test/helpers';

describe('SoftDelete', () => {
    let ids: SeedIds;
    let gybson: GybsonClient;
    let connection;
    beforeAll(async (): Promise<void> => {
        connection = await buildDBSchemas();
        gybson = new GybsonClient(knex());
    });
    afterAll(async () => {
        await closeConnection();
        await gybson.close();
    });
    beforeEach(async () => {
        gybson = new GybsonClient(knex());

        // Seeds
        ids = await seed(gybson);
    });
    describe('usage', () => {
        it('Can soft delete using where filters', async () => {
            const post = await gybson.Posts.loadOne({ where: { post_id: ids.post1Id } });
            expect(post).toEqual(
                expect.objectContaining({
                    post_id: ids.post1Id,
                }),
            );

            await gybson.Posts.softDelete({
                where: {
                    rating_average: {
                        gt: 4,
                    },
                },
            });
            await gybson.Posts.purge();
            const post2 = await gybson.Posts.loadOne({ where: { post_id: ids.post1Id } });
            expect(post2).toEqual(null);
        });
        it('Can soft delete using a boolean column', async () => {
            const post = await gybson.Posts.loadOne({ where: { post_id: ids.post1Id } });
            expect(post).toEqual(
                expect.objectContaining({
                    post_id: ids.post1Id,
                }),
            );

            await gybson.Posts.softDelete({
                where: {
                    post_id: ids.post1Id,
                },
            });
            await gybson.Posts.purge();
            const post2 = await gybson.Posts.loadOne({ where: { post_id: ids.post1Id } });
            expect(post2).toEqual(null);

            const post3 = await gybson.Posts.findMany({ where: { post_id: ids.post1Id } });
            expect(post3).toEqual([]);
        });
        it('Can soft delete using a Date column', async () => {
            const user = await gybson.Users.loadOne({ where: { user_id: ids.user1Id } });
            expect(user).toEqual(
                expect.objectContaining({
                    user_id: ids.user1Id,
                }),
            );

            await gybson.Users.softDelete({
                where: {
                    user_id: ids.user1Id,
                },
            });
            // test both loader and find-many
            await gybson.Users.purge();
            const user2 = await gybson.Users.loadOne({ where: { user_id: ids.user1Id } });
            expect(user2).toEqual(null);

            const post3 = await gybson.Users.findMany({ where: { user_id: ids.user1Id } });
            expect(post3).toEqual([]);
        });
        it('Can use an external connection', async () => {
            const connection = await getPoolConnection();
            const post = await gybson.Posts.loadOne({ where: { post_id: ids.post1Id } });
            expect(post).toEqual(
                expect.objectContaining({
                    post_id: ids.post1Id,
                }),
            );

            await gybson.Posts.softDelete({
                connection,
                where: {
                    rating_average: {
                        gt: 4,
                    },
                },
            });
            await gybson.Posts.purge();
            const post2 = await gybson.Posts.loadOne({ where: { post_id: ids.post1Id } });
            expect(post2).toEqual(null);
            await closePoolConnection(connection);
        });
    });
});
