"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.window={
    showInformationMessage(text){
        console.log(text)
    },activeTextEditor:{
        document:{
            fileName:"test",
            getText(){
                return "test"
            }
        }
    }
};
exports.commands={
    executeCommand:{

    }
};
exports.workspace={
    workspaceFolders:'D:/文档/GitHub/chrrg.github.io/chhub'//工作目录需要在这里修改
};
//exports.vscode = vscode;
//# sourceMappingURL=project.js.map