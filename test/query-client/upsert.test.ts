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
import 'jest-extended';

describe('Upsert', () => {
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
    describe('inserting rows with conflicts', () => {
        it('Updates only the specified fields on conflicting rows', async () => {
            const postId = await gybson.Posts.upsert({
                values: {
                    post_id: ids.post1Id,
                    message: 'new message',
                    author_id: ids.user1Id,
                    rating_average: 6,
                    author: 'new name',
                },
                updateColumns: {
                    message: true,
                    author: true,
                },
            });
            const post = await gybson.Posts.loadOne({ where: { post_id: postId } });
            expect(post).toEqual(
                expect.objectContaining({
                    post_id: ids.post1Id,
                    message: 'new message',
                    author_id: ids.user1Id,
                    rating_average: 4.5,
                    author: 'new name',
                }),
            );
        });
        it('Updates specified fields on a subset of rows that conflict', async () => {
            // first post has conflict second doesn't
            const postId = await gybson.Posts.upsert({
                values: [
                    {
                        post_id: ids.post1Id,
                        message: 'another new message',
                        author_id: ids.user1Id,
                        rating_average: 6,
                        author: 'name',
                    },
                    {
                        message: 'test 100',
                        author_id: ids.user1Id,
                        rating_average: 8,
                        author: 'name',
                    },
                ],
                updateColumns: {
                    message: true,
                },
            });
            const posts = await gybson.Posts.loadMany({ where: { author_id: ids.user1Id } });
            expect(posts).toIncludeAllMembers([
                expect.objectContaining({
                    post_id: ids.post1Id,
                    message: 'another new message',
                    author_id: ids.user1Id,
                }),
                expect.objectContaining({
                    message: 'test 100',
                    author_id: ids.user1Id,
                    rating_average: 8,
                    author: 'name',
                }),
            ]);
        });
        it('Can reinstate soft-deleted rows', async () => {
            await gybson.Posts.softDelete({
                where: {
                    post_id: ids.post1Id,
                },
            });
            const post = await gybson.Posts.loadOne({ where: { post_id: ids.post1Id } });
            expect(post).toEqual(null);

            const postId = await gybson.Posts.upsert({
                values: {
                    post_id: ids.post1Id,
                    message: 'new message',
                    rating_average: 6,
                    author: 'name',
                    author_id: ids.user1Id,
                },
                updateColumns: {
                    message: true,
                },
                reinstateSoftDeletedRows: true,
            });
            await gybson.Posts.purge();
            const post2 = await gybson.Posts.loadOne({ where: { post_id: postId } });
            expect(post2).toEqual(
                expect.objectContaining({
                    post_id: ids.post1Id,
                }),
            );
        });
        it('Returns the id of the first upserted row', async () => {
            const postId = await gybson.Posts.upsert({
                values: {
                    message: 'test 2',
                    author_id: ids.user1Id,
                    rating_average: 6,
                    author: 'name',
                    created: new Date(2003, 20, 4),
                },
                updateColumns: {
                    message: true,
                },
            });
            expect(postId).toBeDefined();
            const post = await gybson.Posts.loadOne({ where: { post_id: postId } });
            expect(post).toEqual(
                expect.objectContaining({
                    post_id: postId,
                }),
            );
        });
    });
    describe('inserting rows without conflicts', () => {
        it('Can insert a single row', async () => {
            const postId = await gybson.Posts.upsert({
                values: {
                    message: 'test 2',
                    author_id: ids.user1Id,
                    rating_average: 6,
                    author: 'name',
                },
                updateColumns: {
                    message: true,
                },
            });
            const post = await gybson.Posts.loadOne({ where: { post_id: postId } });
            expect(post).toEqual(
                expect.objectContaining({
                    post_id: postId,
                    message: 'test 2',
                    rating_average: 6,
                    author: 'name',
                }),
            );
        });
        it('Can insert multiple rows', async () => {
            const postId = await gybson.Posts.upsert({
                values: [
                    {
                        message: 'test 2',
                        author_id: ids.user1Id,
                        rating_average: 6,
                        author: 'name',
                    },
                    {
                        message: 'test 3',
                        author_id: ids.user1Id,
                        rating_average: 8,
                        author: 'name',
                    },
                ],
                updateColumns: {
                    message: true,
                },
            });
            const posts = await gybson.Posts.loadMany({ where: { author_id: ids.user1Id } });
            expect(posts).toIncludeAllMembers([
                expect.objectContaining({
                    post_id: postId,
                    message: 'test 2',
                    rating_average: 6,
                }),
                expect.objectContaining({
                    post_id: postId + 1,
                    message: 'test 3',
                    author_id: ids.user1Id,
                    rating_average: 8,
                }),
            ]);
        });
        it('Returns the id of the first inserted row', async () => {
            const postId = await gybson.Posts.upsert({
                values: {
                    message: 'test 2',
                    author_id: ids.user1Id,
                    rating_average: 6,
                    author: 'name',
                    created: new Date(2003, 20, 4),
                },
                updateColumns: {
                    message: true,
                },
            });
            expect(postId).toBeDefined();
            const post = await gybson.Posts.loadOne({ where: { post_id: postId } });
            expect(post).toEqual(
                expect.objectContaining({
                    post_id: postId,
                }),
            );
        });
        it('Throws error if the upsert fails', async () => {
            // author_id is non existing
            await expect(
                gybson.Posts.upsert({
                    values: {
                        post_id: ids.post1Id,
                        message: 'test 2',
                        author_id: 50000,
                        author: 'sgdsags',
                        rating_average: 6,
                        created: new Date(2003, 20, 4),
                    },
                    updateColumns: {
                        author_id: true,
                    },
                }),
            ).rejects.toThrow(Error);
        });
    });
    it('Can use an external connection', async () => {
        const connection = await getPoolConnection();
        const postId = await gybson.Posts.upsert({
            connection,
            values: {
                message: 'test 2',
                author_id: ids.user1Id,
                rating_average: 6,
                author: 'name',
                created: new Date(2003, 20, 4),
            },
            updateColumns: {
                message: true,
            },
        });
        expect(postId).toBeDefined();
        await closePoolConnection(connection);
    });
});
