"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const ws = require("websocket");
const http = require("http");
const project_1 = require("./project");
const DEBUG = false;
function logDebug(message, ...optionalParams) {
    if (DEBUG) {
        console.log.apply(console, arguments);
    }
}
const HANDSHAKE_TIMEOUT = 10 * 1000;
class Device extends events_1.EventEmitter {
    constructor(connection) {
        super();
        this.attached = false;
        this.toString = () => {
            if (!this.connection) {
                return `${this.name}[Disconnected]`;
            }
            if (!this.name) {
                return `Device (${this.connection.remoteAddress})`;
            }
            return `Device ${this.name}(${this.connection.remoteAddress})`;
        };
        this.connection = connection;
        this.read(this.connection);
        this.on('data:hello', data => {
            logDebug("on client hello: ", data);
            this.attached = true;
            this.name = data['device_name'];
            this.send("hello", {
                "server_version": 2
            });
            this.emit("attach", this);
        });
        setTimeout(() => {
            if (!this.attached) {
                console.log("handshake timeout");
                this.connection.close();
                this.connection = null;
            }
        }, HANDSHAKE_TIMEOUT);
    }
    send(type, data) {
        this.connection.sendUTF(JSON.stringify({
            type: type,
            data: data
        }));
    }
    sendBytes(bytes) {
        this.connection.sendBytes(bytes);
    }
    sendBytesCommand(command, md5, data = {}) {
        data = Object(data);
        data['command'] = command;
        this.connection.sendUTF(JSON.stringify({
            type: 'bytes_command',
            md5: md5,
            data: data
        }));
    }
    sendCommand(command, data) {
        data = Object(data);
        data['command'] = command;
        this.send('command', data);
    }
    read(connection) {
        connection.on('message', message => {
            logDebug("message: ", message);
            if (message.type == 'utf8') {
                try {
                    let json = JSON.parse(message.utf8Data);
                    logDebug("json: ", json);
                    this.emit('message', json);
                    this.emit('data:' + json['type'], json['data']);
                }
                catch (e) {
                    console.error(e);
                }
            }
        });
        connection.on('close', (reasonCode, description) => {
            console.log(`close: device = ${this}, reason = ${reasonCode}, desc = ${description}`);
            this.connection = null;
            this.emit('disconnect');
        });
    }
}
exports.Device = Device;
class AutoJsDebugServer extends events_1.EventEmitter {
    constructor(port) {
        super();
        this.devices = [];
        this.project = null;
        this.fileFilter = (relativePath, absPath, stats) => {
            if (!this.project) {
                return true;
            }
            return this.project.fileFilter(relativePath, absPath, stats);
        };
        this.port = port;
        this.httpServer = http.createServer(function (request, response) {
            console.log(new Date() + ' Received request for ' + request.url);
            response.writeHead(404);
            response.end();
        });
        var wsServer = new ws.server({ httpServer: this.httpServer });
        wsServer.on('request', request => {
            logDebug('request: ', request);
            let connection = this.openConnection(request);
            if (!connection) {
                return;
            }
            let device = new Device(connection);
            device.on("attach", (device) => {
                this.attachDevice(device);
                this.emit('new_device', device);
            });
        });
    }
    openConnection(request) {
        return request.accept();
    }
    listen() {
        this.httpServer.on('error', (e) => {
            console.error('server error: ', e);
        });
        this.httpServer.listen(this.port, '0.0.0.0', () => {
            let address = this.httpServer.address();
            console.log(`server listening on ${address.address}':${address.port}`);
            this.emit("connect");
        });
    }
    send(type, data) {
        this.devices.forEach(device => {
            device.send(type, data);
        });
    }
    sendBytes(data) {
        this.devices.forEach(device => {
            device.sendBytes(data);
        });
    }
    sendBytesCommand(command, md5, data = {}) {
        this.devices.forEach(device => {
            device.sendBytesCommand(command, md5, data);
        });
    }
    sendProjectCommand(folder, command) {
        this.devices.forEach(device => {
            if (device.projectObserser == null || device.projectObserser.folder != folder) {
                device.projectObserser = new project_1.ProjectObserser(folder, this.fileFilter);
            }
            device.projectObserser.diff()
                .then(result => {
                device.sendBytes(result.buffer);
                device.sendBytesCommand(command, result.md5, {
                    'id': folder,
                    'name': folder
                });
            });
        });
    }
    sendCommand(command, data = {}) {
        this.devices.forEach(device => {
            device.sendCommand(command, data);
        });
    }
    disconnect() {
        this.httpServer.close();
        this.emit("disconnect");
    }
    attachDevice(device) {
        this.devices.push(device);
        device.on('data:log', data => {
            console.log(data['log']);
            this.emit('log', data['log']);
        });
        device.on('disconnect', this.detachDevice.bind(this, device));
    }
    detachDevice(device) {
        this.devices.splice(this.devices.indexOf(device), 1);
        console.log("detachDevice: " + device);
    }
}
exports.AutoJsDebugServer = AutoJsDebugServer;
//# sourceMappingURL=autojs-debug.js.map