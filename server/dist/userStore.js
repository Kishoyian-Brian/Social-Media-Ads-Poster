"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readUsers = readUsers;
exports.writeUsers = writeUsers;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dataPath = path_1.default.resolve(process.cwd(), 'server', 'src', 'data', 'users.json');
function readUsers() {
    if (!fs_1.default.existsSync(dataPath)) {
        fs_1.default.writeFileSync(dataPath, JSON.stringify([], null, 2), 'utf8');
    }
    const raw = fs_1.default.readFileSync(dataPath, 'utf8');
    try {
        return JSON.parse(raw);
    }
    catch {
        return [];
    }
}
function writeUsers(users) {
    fs_1.default.writeFileSync(dataPath, JSON.stringify(users, null, 2), 'utf8');
}
