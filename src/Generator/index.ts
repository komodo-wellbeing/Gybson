import path from 'path';
// @ts-ignore - no types for prettier
import { format } from 'prettier';
import fs from 'fs-extra';
import { prettier, codeGenPreferences } from './config';
import Knex from 'knex';
import { MySQLIntrospection } from './Introspection/MySQLIntrospection';
import { TableClientBuilder } from './TableClientBuilder/TableClientBuilder';
import { Introspection } from './Introspection/IntrospectionTypes';
import { TypeBuilder } from './TypeBuilder/TypeBuilder';

// TODO:- options

function currentDateTime() {
    const d = new Date();
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString()}`;
}

/**
 * Write to a typescript file
 * @param content
 * @param directory
 * @param filename
 */
async function writeTypescriptFile(content: string, directory: string, filename: string) {
    const fileHeader = `
         /* Auto generated by Nodent on ${currentDateTime()} - DO NOT MODIFY */
        
        /* eslint @typescript-eslint/no-namespace: 0 */
        /* eslint  @typescript-eslint/class-name-casing: 0 */
    `;

    // append creates files if they don't exist - write overwrites contents
    await fs.appendFile(path.join(directory, filename), '');
    await fs.writeFile(
        path.join(directory, filename),
        format(fileHeader + content, { parser: 'typescript', ...prettier }),
    );
}

// **************************
// generate types
// **************************

async function generateTypes(db: Introspection, outdir: string): Promise<void> {
    const tables = await db.getSchemaTables();
    const enums = await db.getEnumTypes();

    const typeBuilder = new TypeBuilder(tables, enums, codeGenPreferences);

    const types = await typeBuilder.build(db);

    await writeTypescriptFile(types, outdir, 'db-schema.ts');
}

// **************************
// generate client libs
// **************************

/**
 * Build an entry point file
 * @param builders
 * @param outdir
 */
async function generateClientIndex(builders: TableClientBuilder[], outdir: string) {
    let index = ``;
    let clients = ``;
    for (let builder of builders) {
        index += `import ${builder.className} from './${builder.className}';`;
        clients += `${builder.className}: new ${builder.className}(),`;
    }
    index += `
        const Nodent = () => {
        return {${clients}};
        };
        export default Nodent;
    `;

    await writeTypescriptFile(index, outdir, 'index.ts');
}

/**
 * Generate the db clients for each table
 * @param db
 * @param outdir
 */
async function generateClients(db: Introspection, outdir: string): Promise<string[]> {
    const builders: TableClientBuilder[] = [];
    const tables = await db.getSchemaTables();
    const enums = await db.getEnumTypes();

    for (let table of tables) {
        const builder = new TableClientBuilder(table, enums, codeGenPreferences);
        builders.push(builder);
        await writeTypescriptFile(await builder.build(db), outdir, `${builder.className}.ts`);
    }

    // BUILD ENTRY POINT
    await generateClientIndex(builders, outdir);

    return tables;
}

// ****************************
// Entry point
// ****************************

interface Connection {
    client: 'mysql' | 'postgres';
    connection: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
    };
}

export async function generate(conn: Connection, outdir: string) {
    console.log(`Generating client for schema: ${conn.connection.database}`);

    const knex = Knex(conn);
    let DB: Introspection;

    if (conn.client === 'mysql') {
        DB = new MySQLIntrospection(knex, conn.connection.database);
    } else throw new Error('PostgreSQL not currently supported');

    await generateTypes(DB, outdir);
    const tables = await generateClients(DB, outdir);

    console.log(`Generated for ${tables.length} tables in ${outdir}`);
    await knex.destroy();
}
