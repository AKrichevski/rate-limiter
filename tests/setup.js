"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const test_utils_1 = require("./helpers/test-utils");
dotenv_1.default.config();
(0, test_utils_1.setupJestGlobals)();
