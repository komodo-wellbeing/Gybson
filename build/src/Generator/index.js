"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate = void 0;
const path_1 = __importDefault(require("path"));
// @ts-ignore
const prettier_1 = require("prettier");
const fs_extra_1 = __importDefault(require("fs-extra"));
const config_1 = require("./config");
const knex_1 = __importDefault(require("knex"));
const MySQLIntrospection_1 = require("./Introspection/MySQLIntrospection");
const TableClientBuilder_1 = require("./TableClientBuilder/TableClientBuilder");
const TypeBuilder_1 = require("./TypeBuilder/TypeBuilder");
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
function writeTypescriptFile(content, directory, filename) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileHeader = `
         /* Auto generated by Nodent on ${currentDateTime()} - DO NOT MODIFY */
        
        /* eslint @typescript-eslint/no-namespace: 0 */
        /* eslint  @typescript-eslint/class-name-casing: 0 */
    `;
        // append creates files if they don't exist - write overwrites contents
        yield fs_extra_1.default.appendFile(path_1.default.join(directory, filename), '');
        yield fs_extra_1.default.writeFile(path_1.default.join(directory, filename), prettier_1.format(fileHeader + content, Object.assign({ parser: 'typescript' }, config_1.prettier)));
    });
}
// **************************
// generate types
// **************************
function generateTypes(db, outdir) {
    return __awaiter(this, void 0, void 0, function* () {
        const tables = yield db.getSchemaTables();
        const enums = yield db.getEnumTypes();
        const typeBuilder = new TypeBuilder_1.TypeBuilder(tables, enums, config_1.codeGenPreferences);
        const types = yield typeBuilder.build(db);
        yield writeTypescriptFile(types, outdir, 'db-schema.ts');
    });
}
// **************************
// generate loaders
// **************************
/**
 * Generate the db clients for each table
 * @param db
 * @param outdir
 */
function generateClients(db, outdir) {
    return __awaiter(this, void 0, void 0, function* () {
        const builders = [];
        const tables = yield db.getSchemaTables();
        const enums = yield db.getEnumTypes();
        for (let table of tables) {
            const builder = new TableClientBuilder_1.TableClientBuilder(table, enums, config_1.codeGenPreferences);
            builders.push(builder);
            yield writeTypescriptFile(yield builder.build(db), outdir, `${builder.className}.ts`);
        }
        // BUILD ENTRY POINT
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
        yield writeTypescriptFile(index, outdir, 'index.ts');
        return tables;
    });
}
function generate(conn, outdir) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Generating client for schema: ${conn.connection.database}`);
        const knex = knex_1.default(conn);
        let DB;
        if (conn.client === 'mysql') {
            DB = new MySQLIntrospection_1.MySQLIntrospection(knex, conn.connection.database);
        }
        else
            throw new Error('PostgreSQL not currently supported');
        yield generateTypes(DB, outdir);
        const tables = yield generateClients(DB, outdir);
        console.log(`Generated for ${tables.length} tables in ${outdir}`);
        yield knex.destroy();
    });
}
exports.generate = generate;
//# sourceMappingURL=index.js.map