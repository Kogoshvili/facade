import Handlebars from "handlebars";
import fs from "fs";

function view(path, data) {
    const callerFile = Error().stack.split("\n")[2].split(" ").pop();
    const callerPath = callerFile.substring(0, callerFile.lastIndexOf("/"));
    const sourcePath = `${callerPath}/${path}.html`;

    const source = fs.readFileSync(sourcePath.substring(9), "utf8");

    const template = Handlebars.compile(source);

    return template(data);
}

export default view;
