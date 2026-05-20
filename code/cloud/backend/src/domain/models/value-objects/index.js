"use strict";
/**
 * Shared Value Objects
 *
 * 这些 Value Objects 在多个实体中复用
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssigneeRef = exports.OwnerRef = exports.ActorRef = void 0;
var actor_ref_1 = require("./actor-ref");
Object.defineProperty(exports, "ActorRef", { enumerable: true, get: function () { return actor_ref_1.ActorRef; } });
var owner_ref_1 = require("./owner-ref");
Object.defineProperty(exports, "OwnerRef", { enumerable: true, get: function () { return owner_ref_1.OwnerRef; } });
var assignee_ref_1 = require("./assignee-ref");
Object.defineProperty(exports, "AssigneeRef", { enumerable: true, get: function () { return assignee_ref_1.AssigneeRef; } });
