"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("./vscode");
const fs = require("fs");
const diff_1 = require("./diff");
const archiver = require("archiver");
const path = require("path");
const cryto = require("crypto");
const walk = require("walk");
const streamBuffers = require("stream-buffers");
class ProjectTemplate {
    constructor(uri) {
        this.uri = uri;
    }
    build() {

        var projectConfig = new ProjectConfig();
        projectConfig.name = "新建项目";
        projectConfig.main = "main.js";
        projectConfig.ignore = ["build"];
        projectConfig.packageName = "com.example";
        projectConfig.versionName = "1.0.0";
        projectConfig.versionCode = 1;
        var uri = this.uri;

        var jsonFilePath = path.join(uri.fsPath, "project.json");
        var mainFilePath = path.join(uri.fsPath, "main.js");
        var mainScript = "toast('Hello, Auto.js');";

        return projectConfig.save(jsonFilePath)
            .then(() => {
            return new Promise(function (res, rej) {
                fs.writeFile(mainFilePath, mainScript, function (err) {
                    if (err) {
                        rej(err);
                        return;
                    }
                    res(uri);
                });
            });
        });
    }
}
exports.ProjectTemplate = ProjectTemplate;
class Project {
    constructor(folder) {
        this.fileFilter = (relativePath, absPath, stats) => {
            return this.config.ignore.filter(p => {
                var fullPath = path.join(this.folder.fsPath, p);
                return absPath.startsWith(fullPath);
            }).length == 0;
        };
        this.folder = folder;
        this.config = ProjectConfig.fromJsonFile(path.join(this.folder.fsPath, "project.json"));
        return;
        fs.watch(folder.fsPath+"project\.json", function (event, filename) {
            console.log("file changed: ", event.fsPath);
            if (event.fsPath == path.join(this.folder.fsPath, "project.json")) {
                this.config = ProjectConfig.fromJsonFile(event.fsPath);
                console.log("project.json changed: ", this.config);
            }
        });
        return;
        this.watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder.fsPath, "project\.json"));
        this.watcher.onDidChange((event) => {
            console.log("file changed: ", event.fsPath);
            if (event.fsPath == path.join(this.folder.fsPath, "project.json")) {
                this.config = ProjectConfig.fromJsonFile(event.fsPath);
                console.log("project.json changed: ", this.config);
            }
        });
    }
    dispose() {
        // this.watcher.dispose();
    }
}
exports.Project = Project;
class ProjectObserser {
    constructor(folder, filter) {
        this.folder = folder;
        this.fileFilter = filter;
        this.fileObserver = new diff_1.FileObserver(folder, filter);
    }
    diff() {
        return this.fileObserver.walk()
            .then(changedFiles => {
            var zip = archiver('zip');
            var streamBuffer = new streamBuffers.WritableStreamBuffer();
            zip.pipe(streamBuffer);
            changedFiles.forEach(relativePath => {
                zip.append(fs.createReadStream(path.join(this.folder, relativePath)), { name: relativePath });
            });
            zip.finalize();
            return new Promise((res, rej) => {
                zip.on('finish', () => {
                    streamBuffer.end();
                    res(streamBuffer.getContents());
                });
            });
        })
            .then(buffer => {
            var md5 = cryto.createHash('md5').update(buffer).digest('hex');
            return {
                buffer: buffer,
                md5: md5
            };
        });
    }
    zip() {
        return new Promise((res, rej) => {
            var walker = walk.walk(this.folder);
            var zip = archiver('zip');
            var streamBuffer = new streamBuffers.WritableStreamBuffer();
            zip.pipe(streamBuffer);
            walker.on("file", (root, stat, next) => {
                var filePath = path.join(root, stat.name);
                var relativePath = path.relative(this.folder, filePath);
                if (!this.fileFilter(relativePath, filePath, stat)) {
                    next();
                    return;
                }
                zip.append(fs.createReadStream(path.join(this.folder, relativePath)), { name: relativePath });
                next();
            });
            walker.on("end", () => {
                zip.finalize();
                return new Promise((res, rej) => {
                    zip.on('finish', () => {
                        streamBuffer.end();
                        res(streamBuffer.getContents());
                    });
                });
            });
        });
    }
}
exports.ProjectObserser = ProjectObserser;
class LaunchConfig {
}
exports.LaunchConfig = LaunchConfig;
class ProjectConfig {
    save(path) {
        return new Promise((res, rej) => {
            var json = JSON.stringify(this, null, 4);
            fs.writeFile(path, json, function (err) {
                if (err) {
                    rej(err);
                    return;
                }
                res(path);
            });
        });
    }
    static fromJson(text) {
        var config = JSON.parse(text);
        config.ignore = (config.ignore || []).map(p => path.normalize(p));
        return config;
    }
    static fromJsonFile(path) {
        var text = fs.readFileSync(path).toString("utf-8");
        var config = JSON.parse(text);
        config.ignore = (config.ignore || []);
        return config;
    }
}
exports.ProjectConfig = ProjectConfig;
//# sourceMappingURL=project.js.map