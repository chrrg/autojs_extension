"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const readline = require("readline");
const events_1 = require("events");
class Device extends events_1.EventEmitter {
    constructor(socket) {
        super();
        this.toString = () => {
            if (!this.socket) {
                return `${this.name}[Disconnected]`;
            }
            if (!this.name) {
                return `Device (${this.socket.remoteAddress}:${this.socket.remotePort})`;
            }
            return `Device ${this.name}(${this.socket.remoteAddress}:${this.socket.remotePort})`;
        };
        this.socket = socket;
        socket.setEncoding('utf-8');
        this.readFromSocket(socket);
        this.on('data:device_name', data => {
            this.name = data['device_name'];
            console.log('device: ' + this);
        });
    }
    send(data) {
        let json = JSON.stringify(data);
        this.socket.write(json);
        this.socket.write('\n');
    }
    readFromSocket(socket) {
        let rl = readline.createInterface(socket);
        rl.on('line', line => {
            let jsonObj = JSON.parse(line);
            this.emit('data', jsonObj);
            this.emit('data:' + jsonObj['type'], jsonObj);
        });
        socket.on('close', () => {
            this.socket = null;
            this.emit('disconnect');
        });
    }
}
exports.Device = Device;
class AutoJsDebugServer extends events_1.EventEmitter {
    constructor(port) {
        super();
        this.devices = [];
        this.port = port;
        this.server = net.createServer(socket => {
            let device = new Device(socket);
            this.attachDevice(device);
            this.emit('new_device', device);
        });
    }
    listen() {
        this.server.listen(this.port, '0.0.0.0', () => {
            let address = this.server.address();
            console.log(`server listening on ${address.address}':${address.port}`);
            this.emit("connect");
        });
    }
    send(data) {
        this.devices.forEach(device => {
            device.send(data);
        });
    }
    disconnect() {
        this.server.close();
        this.emit("disconnect");
    }
    attachDevice(device) {
        this.devices.push(device);
        device.on('data:log', data => {
            console.log(data['log']);
        });
        device.on('disconnect', this.detachDevice.bind(this, device));
    }
    detachDevice(device) {
        this.devices.splice(this.devices.indexOf(device), 1);
        console.log("detachDevice" + device);
    }
}
exports.AutoJsDebugServer = AutoJsDebugServer;
//# sourceMappingURL=autojs-debug-old.js.map