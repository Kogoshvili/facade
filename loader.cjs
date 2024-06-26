const babel = require('@babel/core');
const t = require('@babel/types');
const { cloneDeep } = require('lodash');
const generate = require('@babel/generator').default;
const path = require('path');
const tsPlugin = require.resolve('@babel/plugin-syntax-typescript');
const importPlugin = require.resolve('babel-plugin-remove-unused-import');

module.exports = function (source, map) {
    if (this.resourcePath.includes('.script.')) {
        return source;
    }

    if (path.extname(this.resourcePath) === '.facade') {
        return handleFacade.call(this, source, map);
    }

    return handleClass.call(this, source, map);
};

function handleClass(source, map) {
    const filename = path.basename(this.resourcePath, path.extname(this.resourcePath));

    // Parse the source code into an AST
    const ast = babel.parseSync(source, {
        sourceType: 'module',
        plugins: [[tsPlugin, { isTSX: true, disallowAmbiguousJSXLike: false }]],
    });

    const importStatements = [
        // t.importDeclaration(
        //     [t.importSpecifier(t.identifier('FComponent'), t.identifier('FComponent'))],
        //     t.stringLiteral('facade/component')
        // )
    ];

    const scriptMethods = [];
    let className = null;

    // Visit each node in the AST
    babel.traverse(ast, {
        ImportDeclaration(path) {
            importStatements.push(path.node);
        },
        ClassDeclaration(path) {
            className = path.node.id.name;
            path.traverse({
                ClassMethod(path) {
                    if (path.node.key.name.startsWith('script')) {
                        scriptMethods.push(cloneDeep(path.node));

                        if (path.node.key.name === 'script') {
                            path.node.body = t.blockStatement([
                                t.returnStatement(
                                    t.objectExpression([
                                        t.objectProperty(
                                            t.identifier('name'),
                                            t.stringLiteral(className)
                                        ),
                                        t.objectProperty(
                                            t.identifier('url'),
                                            t.stringLiteral('./static/scripts/' + filename + '.js')
                                        )
                                    ])
                                )
                            ])
                        } else {
                            path.node.body = t.blockStatement([]);
                        }
                    }
                }
            });
        }
    });

    if (scriptMethods.length > 0) {
        const originalFileName = path.basename(this.resourcePath, path.extname(this.resourcePath));
        const scriptFilePath = `${originalFileName}.script.ts`;

        // Create a new class declaration
        const classDeclaration = t.classDeclaration(
            t.identifier(className),
            null,
            t.classBody(scriptMethods),
            []
        );

        const { code: scriptFunctionCode } = generate(
            t.program([...importStatements, classDeclaration, t.exportDefaultDeclaration(t.identifier(className))])
        );

        const { code } = babel.transformSync(scriptFunctionCode, {
            plugins: [tsPlugin, importPlugin]
        });

        this.emitFile(path.join('web', scriptFilePath), code);
    }

    // Generate the source map
    const result = babel.transformFromAstSync(ast, source, {
        sourceMaps: true,
        sourceFileName: this.resourcePath,
    });

    return this.callback(null, result.code, result.map);
}

function handleFacade(source, map) {
    if (!source.includes('<script>') && !source.includes('<template>')) {
        return source;
    }

    // Extract the HTML template
    const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/);
    const template = templateMatch ? templateMatch[1] : '';

    // Extract the script content
    const scriptMatch = source.match(/<script>([\s\S]*?)<\/script>/);
    const scriptContent = scriptMatch ? scriptMatch[1] : '';

    // Extract the style content
    const styleMatch = source.match(/<style>([\s\S]*?)<\/style>/);
    const styleContent = styleMatch ? styleMatch[1] : '';

    // Check if the script is TypeScript or JavaScript
    // path.extname(this.resourcePath).includes('ts')
    //scriptMatch[0].includes('lang="ts"');
    const isTypeScript = true;

    // Parse the script content into an AST
    const ast = babel.parseSync(scriptContent, {
        sourceType: 'module',
        plugins: [tsPlugin],
    });

    // Get the filename and class name
    const filename = path.basename(this.resourcePath, path.extname(this.resourcePath));
    const className = filename.replace(/[^a-zA-Z0-9_]/g, '_');

    // Create a new class declaration
    const classDeclaration = t.classDeclaration(
        t.identifier(className),
        t.identifier('FComponent'),
        t.classBody([]),
        []
    );

    const scriptFunctions = [];
    const callerStatements = [];
    const effects = [];

    // Visit each node in the AST
    babel.traverse(ast, {
        VariableDeclaration(path) {
            // Check if the variable declaration is not inside a function
            if (!path.findParent((parent) => parent.isFunction())) {
                // Convert variable declarations to class properties
                const declarations = path.node.declarations.map((declaration) =>
                    t.classProperty(
                        t.identifier(declaration.id.name),
                        declaration.init
                    )
                );
                classDeclaration.body.body.push(...declarations);
            }
        },
        FunctionDeclaration(path) {
            const identifier = t.identifier(path.node.id.name);
            if (identifier.name.startsWith('script')) {
                scriptFunctions.push(path.node);
                path.remove();

                const method = t.classMethod(
                    'method',
                    identifier,
                    [],
                    t.blockStatement([
                        t.returnStatement(
                            t.objectExpression([
                                t.objectProperty(
                                    t.identifier('name'),
                                    t.stringLiteral(filename)
                                ),
                                t.objectProperty(
                                    t.identifier('url'),
                                    t.stringLiteral('./static/' + filename + '.js')
                                )
                            ])
                        )
                    ])
                );
                classDeclaration.body.body.push(method);
            } else {
                // Convert function declarations to class methods
                const method = t.classMethod(
                    'method',
                    identifier,
                    path.node.params,
                    path.node.body,
                    path.node.computed,
                    path.node.static,
                    path.node.generator,
                    path.node.async // Preserve the async keyword
                );
                classDeclaration.body.body.push(method);
            }
        },
        CallExpression(path) {
            // Check if the call expression is not inside a function and not part of a variable declaration
            if (
                !path.findParent((parent) => parent.isFunction()) &&
                !path.findParent((parent) => parent.isVariableDeclaration())
            ) {
                if (path.node.callee.name === 'effect') {
                    effects.push(path.node);
                } else {
                    callerStatements.push(t.expressionStatement(path.node));
                }
                path.remove();
            }
        },
    });

    // Add the effects array to the class
    if (effects.length > 0) {
        const wrappedEffects = effects.map((effect) =>
            t.arrowFunctionExpression([], effect)
        );
        const effectsProperty = t.classProperty(
            t.identifier('effects'),
            t.arrayExpression(wrappedEffects)
        );
        classDeclaration.body.body.push(effectsProperty);
    }

    // Add the caller method to the class if there are caller statements
    if (callerStatements.length > 0) {
        const callerMethod = t.classMethod(
            'method',
            t.identifier('callExpressions'),
            [],
            t.blockStatement(callerStatements),
            false,
            false
        );
        classDeclaration.body.body.push(callerMethod);
    }

    if (styleContent) {
        // add style method
        const styleMethod = t.classMethod(
            'method',
            t.identifier('style'),
            [],
            t.blockStatement([
                t.returnStatement(
                    t.objectExpression([
                        t.objectProperty(
                            t.identifier('name'),
                            t.stringLiteral(filename)
                        ),
                        t.objectProperty(
                            t.identifier('url'),
                            t.stringLiteral('./static/' + filename + '.css')
                        )
                    ])
                )
            ]),
            false,
            false
        );

        classDeclaration.body.body.push(styleMethod);
    }

    // Add the static render method to the class with 'this' parameter
    const renderMethod = t.classMethod(
        'method',
        t.identifier('render'),
        [],
        t.blockStatement([
            t.returnStatement(
                t.jsxFragment(
                    t.jsxOpeningFragment(),
                    t.jsxClosingFragment(),
                    [t.jsxText(template)]
                )
            ),
        ]),
        false,
        false
    );
    classDeclaration.body.body.push(renderMethod);

    const componentCode = babel.transformFromAstSync(
        t.program([classDeclaration]),
        null,
        {
            sourceMaps: true,
            sourceFileName: this.resourcePath,
        }
    );

    if (scriptFunctions.length > 0 || styleContent) {
        // make function for style
        scriptFunctions.push(t.functionDeclaration(
            t.identifier('style'),
            [],
            t.blockStatement([
                t.returnStatement(
                    t.objectExpression(styleContent ? [
                        t.objectProperty(
                            t.identifier('name'),
                            t.stringLiteral(filename)
                        ),
                        t.objectProperty(
                            t.identifier('url'),
                            t.stringLiteral('./static/' + filename + '.css')
                        )
                    ] : [])
                )
            ])
        ));

        const exportedStatements = scriptFunctions.map((scriptFunction) => {
            return t.exportNamedDeclaration(scriptFunction);
        });

        const { code: scriptFunctionCode } = generate(t.program(exportedStatements));

        // Emit the script function as a separate file
        const originalFileName = path.basename(this.resourcePath, path.extname(this.resourcePath));
        const scriptFilePath = `${originalFileName}.scripts.ts`;
        let finalScriptCode = source
            .replace(templateMatch?.[0] || '', '')
            .replace(scriptMatch[0], scriptFunctionCode);

        if (styleContent) {
            this.emitFile(path.join('styles', `${filename}.scss`), styleContent);
            finalScriptCode = finalScriptCode.replace(styleMatch[0], `import '${path.join(__dirname, 'dist', 'styles', `${filename}.scss`).replace(/\\/g, '/')}';\n`)
        } else {
            finalScriptCode = finalScriptCode.replace(styleMatch?.[0] ?? '', '');
        }

        const result = babel.transformSync(finalScriptCode, {
            plugins: [tsPlugin, importPlugin]
        });

        // console.log(styleContent[0], finalScriptCode)
        this.emitFile(path.join('web', scriptFilePath), result.code);
    }

        // Replace the <template> and <script> sections with the compiled code
    const finalCode = source
        .replace(templateMatch?.[0] || '', '')
        .replace(styleMatch?.[0] || '', '')
        .replace(scriptMatch[0], `import { FComponent } from '@kogoshvili/facade/component';\n\n` + componentCode.code + `\n\nexport default ${className};\n`);

    // Generate the source map
    const sourceMap = componentCode.map;
    sourceMap.sources = [this.resourcePath];
    sourceMap.sourcesContent = [source];

    // console.log('finalCode', finalCode)
    // Pass the generated JavaScript code and source map to the next loader
    this.callback(null, finalCode, sourceMap);
}
