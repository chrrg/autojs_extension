'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("./vscode");
const autojs_debug_1 = require("./autojs-debug");
const oldAutojs = require("./autojs-debug-old");
const project_1 = require("./project");
const readline = require('readline');
var server = new autojs_debug_1.AutoJsDebugServer(9317);
var oldServer = new oldAutojs.AutoJsDebugServer(1209);

var rl = readline.createInterface({ 
    input: process.stdin,
    output: process.stdout
});
console.log("WorkspaceFolders: "+vscode.workspace.workspaceFolders+"\n");
console.log("Edit workspaceFolders in vscode.js");
console.log("help: [r] runProject [s] saveProject [cls] cls");
console.log("All command:");
console.log("startServer stopServer run runOnDevice stop stopAll rerun save saveToDevice newProject runProject saveProject'");
rl.on('line', function(line){ 
    line=line.trim();
    if(line==="q"){
        extension.stopAll();
    }else if(line==="r"){
        extension.runProject();
    }else if(line==="s"){
        extension.saveProject();
    }else if(line==="cls"){
        process.stdout.write(process.platform === 'win32' ? '\x1Bc' : '\x1B[2J\x1B[3J\x1B[H')
    }else{
        try{
            if(!extension[line]){
                console.log("Error: Unknown command~"+line);
                return;
            }
            extension[line]();
        }catch(e){
            console.log("Error: command occur error~"+e);
        }
    }
});

var recentDevice = null;
server.on('connect', () => {
    vscode.window.showInformationMessage('Auto.js server running');
}).on('new_device', (device) => {
    var messageShown = false;
    var showMessage = () => {
        if (messageShown)
            return;
        vscode.window.showInformationMessage('New device attached: ' + device);
        messageShown = true;
    };
    setTimeout(showMessage, 1000);
    device.on('data:device_name', showMessage);
}).on('log', log => {

});
oldServer.on('connect', () => {
    console.log('Auto.js server running');
}).on('new_device', (device) => {
    var messageShown = false;
    var showMessage = () => {
        if (messageShown)
            return;
        vscode.window.showInformationMessage('New device attached: ' + device);
        messageShown = true;
    };
    setTimeout(showMessage, 1000);
    device.on('data:device_name', showMessage);
});
class Extension {
    startServer() {
        server.listen();
        oldServer.listen();
    }
    stopServer() {
        server.disconnect();
        oldServer.disconnect();
        vscode.window.showInformationMessage('Auto.js server stopped');
    }
    run() {
        this.runOn(server);
        this.runOn(oldServer);
    }
    stop() {
        server.sendCommand('stop', {
            'id': vscode.window.activeTextEditor.document.fileName,
        });
        oldServer.send({
            'type': 'command',
            'view_id': vscode.window.activeTextEditor.document.fileName,
            'command': 'stop',
        });
    }
    stopAll() {
        server.sendCommand('stopAll');
        oldServer.send({
            'type': 'command',
            'command': 'stopAll'
        });
    }
    rerun() {
        let editor = vscode.window.activeTextEditor;
        server.sendCommand('rerun', {
            'id': editor.document.fileName,
            'name': editor.document.fileName,
            'script': editor.document.getText()
        });
        oldServer.send({
            'type': 'command',
            'command': 'rerun',
            'view_id': editor.document.fileName,
            'name': editor.document.fileName,
            'script': editor.document.getText()
        });
    }
    runOnDevice() {
        this.selectDevice(device => this.runOn(device));
    }
    selectDevice(callback) {
        let devices = server.devices;
        devices = devices.concat(oldServer.devices);
        if (recentDevice) {
            let i = devices.indexOf(recentDevice);
            if (i > 0) {
                devices = devices.slice(0);
                devices[i] = devices[0];
                devices[0] = recentDevice;
            }
        }
        let names = devices.map(device => device.toString());
        vscode.window.showQuickPick(names)
            .then(select => {
            let device = devices[names.indexOf(select)];
            recentDevice = device;
            callback(device);
        });
    }
    runOn(target) {
        let editor = vscode.window.activeTextEditor;
        if (target instanceof oldAutojs.Device || target instanceof oldAutojs.AutoJsDebugServer) {
            target.send({
                'type': 'command',
                'command': 'run',
                'view_id': editor.document.fileName,
                'name': editor.document.fileName,
                'script': editor.document.getText()
            });
        }
        else {
            target.sendCommand('run', {
                'id': editor.document.fileName,
                'name': editor.document.fileName,
                'script': editor.document.getText()
            });
        }
    }
    save() {
        this.saveTo(server);
    }
    saveToDevice() {
        this.selectDevice(device => this.saveTo(device));
    }
    saveTo(target) {
        let editor = vscode.window.activeTextEditor;
        if (target instanceof oldAutojs.Device || target instanceof oldAutojs.AutoJsDebugServer) {
            target.send({
                'command': 'save',
                'type': 'command',
                'view_id': editor.document.fileName,
                'name': editor.document.fileName,
                'script': editor.document.getText()
            });
        }
        else {
            target.sendCommand('save', {
                'id': editor.document.fileName,
                'name': editor.document.fileName,
                'script': editor.document.getText()
            });
        }
    }
    newProject() {
        return new project_1.ProjectTemplate({fsPath:vscode.workspace.workspaceFolders}).build();
    }
    runProject() {
        this.sendProjectCommand("run_project");
    }
    sendProjectCommand(command) {
        let folders = [{uri:{"fsPath":vscode.workspace.workspaceFolders}}];
        if (!folders || folders.length == 0) {
            vscode.window.showInformationMessage("请打开一个项目的文件夹");
            return null;
        }
        let folder = folders[0].uri;
        if (!server.project || server.project.folder != folder) {
            server.project && server.project.dispose();
            server.project = new project_1.Project(folder);
        }
        server.sendProjectCommand(folder.fsPath, command);
    }
    saveProject() {
        this.sendProjectCommand("save_project");
    }
}
let extension = new Extension();
exports.extension = extension;
