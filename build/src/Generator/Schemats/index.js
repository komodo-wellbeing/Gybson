"use strict";
/**
 * Nodent takes sql database schema and creates a corresponding typescript interface
 * Created by Matt Goodson
 */
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
exports.Options = exports.typescriptOfSchema = exports.typescriptOfTable = void 0;
const typescript_1 = require("./typescript");
// import { getDatabase, Database } from './schema';
const options_1 = __importDefault(require("./options"));
exports.Options = options_1.default;
const pkgVersion = require('../../../package.json').version;
function getTime() {
    let padTime = (value) => `0${value}`.slice(-2);
    let time = new Date();
    const yyyy = time.getFullYear();
    const MM = padTime(time.getMonth() + 1);
    const dd = padTime(time.getDate());
    const hh = padTime(time.getHours());
    const mm = padTime(time.getMinutes());
    const ss = padTime(time.getSeconds());
    return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
}
function buildHeader(db, tables, schema, options) {
    let commands = ['schemats', 'generate', '-c', db.connectionString.replace(/:\/\/.*@/, '://username:password@')];
    if (options.camelCase)
        commands.push('-C');
    if (tables.length > 0) {
        tables.forEach((t) => {
            commands.push('-t', t);
        });
    }
    if (schema) {
        commands.push('-s', schema);
    }
    return `
        /**
         * AUTO-GENERATED FILE @ ${getTime()} - DO NOT EDIT!
         *
         * This file was automatically generated by schemats v.${pkgVersion}
         * $ ${commands.join(' ')}
         *
         */

    `;
}
function typescriptOfTable(db, table, schema, options = new options_1.default()) {
    return __awaiter(this, void 0, void 0, function* () {
        if (typeof db === 'string') {
            // db = getDatabase(db);
        }
        let interfaces = '';
        let tableTypes = yield db.getTableTypes(table, schema, options);
        interfaces += typescript_1.generateTableTypes(table, tableTypes, options);
        interfaces += typescript_1.generateTableInterface(table, tableTypes, options);
        return interfaces;
    });
}
exports.typescriptOfTable = typescriptOfTable;
function typescriptOfSchema(db, tables = [], schema = null, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        if (typeof db === 'string') {
            // db = any(db);
        }
        if (!schema) {
            schema = db.getDefaultSchema();
        }
        if (tables.length === 0) {
            tables = yield db.getSchemaTables(schema);
        }
        const optionsObject = new options_1.default(options);
        const enumTypes = typescript_1.generateEnumType(yield db.getEnumTypes(schema), optionsObject);
        const interfacePromises = tables.map((table) => typescriptOfTable(db, table, schema, optionsObject));
        const interfaces = yield Promise.all(interfacePromises).then((tsOfTable) => tsOfTable.join(''));
        let output = '/* tslint:disable */\n\n';
        if (optionsObject.options.writeHeader) {
            output += buildHeader(db, tables, schema, options);
        }
        output += enumTypes;
        output += interfaces;
        const formatterOption = {
            replace: false,
            verify: false,
            tsconfig: true,
            tslint: true,
            editorconfig: true,
            tsfmt: true,
            vscode: false,
            tsconfigFile: null,
            tslintFile: null,
            vscodeFile: null,
            tsfmtFile: null,
        };
        return output;
    });
}
exports.typescriptOfSchema = typescriptOfSchema;
//# sourceMappingURL=index.js.map