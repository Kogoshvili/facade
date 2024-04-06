import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import * as parser from '@babel/parser';

const srcDir = 'src';
const distDir = 'dist';

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Function to recursively get all .html files in a directory
function getHtmlFiles(dir) {
    let htmlFiles = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const res = path.resolve(dir, entry.name);
        if (entry.isDirectory()) {
            htmlFiles = [...htmlFiles, ...getHtmlFiles(res)];
        } else if (entry.isFile() && path.extname(entry.name) === '.html') {
            htmlFiles.push(res);
        }
    }

    return htmlFiles;
}

// Get all .html files in the src directory and its subdirectories
const htmlFiles = getHtmlFiles(srcDir);

console.log(`Found ${htmlFiles.length} HTML files in the src directory.`);

htmlFiles.forEach(file => {
    console.log(`Processing file: ${file}`);

    // Read the file content
    const content = fs.readFileSync(file, 'utf8');

    // Load the content into JSDOM
    const dom = new JSDOM(content);
    const document = dom.window.document;

    // Extract the content of the script tag
    const scriptContent = document.querySelector('script').textContent;

    if (!scriptContent) {
        console.log(`No script content found in file: ${file}`);
        return;
    }

    // Parse the script content
    const parsedScript = parser.parse(scriptContent, { sourceType: 'module' });

    let imports = '';
    let stateVars = '';
    let methods = '';

    parsedScript.program.body.forEach(node => {
        if (node.type === 'ImportDeclaration') {
            imports += scriptContent.substring(node.start, node.end) + '\n';
        } else if (node.type === 'VariableDeclaration') {
            stateVars += scriptContent.substring(node.start, node.end) + '\n';
        } else if (node.type === 'FunctionDeclaration') {
            methods += scriptContent.substring(node.start, node.end) + '\n';
        }
    });

    // Write the server and client .js files
    const baseFileName = path.join(distDir, path.relative(srcDir, path.dirname(file)), path.basename(file, '.html'));
    const dirName = path.dirname(baseFileName);
    // Ensure the directory exists
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
    }

    fs.writeFileSync(baseFileName + '.server.js', imports + stateVars + methods, 'utf8');
    fs.writeFileSync(baseFileName + '.client.js', `window.smol.productList = window.smol.productList ?? {};
    window.smol.productList.push({
        initState: {
            ${stateVars}
        },
        methods: {
            ${methods}
        }
    });`, 'utf8');

    // Modify the HTML content
    const template = document.querySelector('template');
    template.querySelector('h1').setAttribute('data-state', 'smol.productList.state.title');
    template.querySelector('button').setAttribute('onclick', 'smol.productList.methods.handleClick()');

    // Write the modified HTML content to a new .html file in the dist directory
    fs.writeFileSync(baseFileName + '.html', template.outerHTML + '\n<script async src="Script.js"></script>', 'utf8');

    console.log(`Processed file: ${file}`);
});

console.log(`Processing complete. Check the dist directory for output files.`);
