"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const walk = require("walk");
const path = require("path");
class FileObserver {
    constructor(dirPath, filter = null) {
        this.files = new Map();
        this.dir = dirPath;
        this.filter = filter;
    }
    walk() {
        return new Promise((res, rej) => {
            var changedFiles = [];
            var walker = walk.walk(this.dir);
            walker.on("file", (root, stat, next) => {
                var filePath = path.join(root, stat.name);
                var relativePath = path.relative(this.dir, filePath);
                if (this.filter && !this.filter(relativePath, filePath, stat)) {
                    next();
                    return;
                }
                var millis = stat.mtime.getTime();
                if (this.files.has(filePath) && this.files.get(filePath)
                    == millis) {
                    next();
                    return;
                }
                this.files.set(filePath, millis);
                changedFiles.push(relativePath);
                next();
            });
            walker.on("end", () => {
                res(changedFiles);
            });
            walker.on("nodeError", err => {
                rej(err);
            });
        });
    }
}
exports.FileObserver = FileObserver;
//# sourceMappingURL=diff.js.map