const babel = require('@babel/core');
const t = require('@babel/types');
const generate = require('@babel/generator').default;
const path = require('path');


module.exports = function (source, map) {
    // if there is no <script> tag, return the source as is
    if (!source.includes('<script>') && !source.includes('<template>')) {
        return source;
    }

    const webpack = this._compiler.webpack;

    // Extract the HTML template
    const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/);
    const template = templateMatch ? templateMatch[1] : '';

    // Extract the script content
    const scriptMatch = source.match(/<script>([\s\S]*?)<\/script>/);
    const scriptContent = scriptMatch ? scriptMatch[1] : '';

    // Check if the script is TypeScript or JavaScript
    // path.extname(this.resourcePath).includes('ts')
    //scriptMatch[0].includes('lang="ts"');
    const isTypeScript = true;

    // Parse the script content into an AST
    const ast = babel.parseSync(scriptContent, {
        sourceType: 'module',
        plugins: ['@babel/plugin-syntax-typescript'],
    });

    // Get the filename and class name
    const filename = path.basename(this.resourcePath, path.extname(this.resourcePath));
    const className = filename.replace(/[^a-zA-Z0-9_]/g, '_');

    // Create a new class declaration
    const classDeclaration = t.classDeclaration(
        t.identifier(className),
        t.identifier('AComponent'),
        t.classBody([]),
        []
    );

    const scriptFunctions = [];

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

                const comment = {
                    type: "CommentBlock",
                    value: " webpackIgnore: true "
                };

                const importStatement = t.expressionStatement(
                    t.callExpression(
                        t.memberExpression(
                            t.callExpression(
                                t.identifier('import'),
                                [
                                    t.stringLiteral('./static/' + filename + '.js')
                                ]
                            ),
                            t.identifier('then')
                        ),
                        [
                            t.arrowFunctionExpression(
                                [t.identifier('args')],
                                t.blockStatement([
                                    t.expressionStatement(
                                        t.callExpression(
                                            t.memberExpression(
                                                t.identifier('console'),
                                                t.identifier('log')
                                            ),
                                            [
                                                // console log args.script
                                                t.memberExpression(
                                                    t.identifier('args'),
                                                    t.identifier('default')
                                                )
                                            ]
                                        )
                                    )
                                ])
                            )
                        ]
                    )
                );

                // Add the comment to the string literal
                const stringLiteral = importStatement.expression.callee.object.arguments[0];
                stringLiteral.leadingComments = [comment];

                // Convert function declarations to class methods
                const method = t.classMethod(
                    'method',
                    identifier,
                    [t.identifier('element')],
                    t.blockStatement([importStatement])
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
    });

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

    if (scriptFunctions.length > 0) {
        const exportedStatements = scriptFunctions.map((scriptFunction) => {
            return t.exportNamedDeclaration(scriptFunction);
        });

        const { code: scriptFunctionCode } = generate(t.program(exportedStatements));

        // Emit the script function as a separate file
        const originalFileName = path.basename(this.resourcePath, path.extname(this.resourcePath));
        const scriptFilePath = `${originalFileName}.scripts.ts`;
        const finalScriptCode = source
            .replace(templateMatch[0], '')
            .replace(scriptMatch[0], scriptFunctionCode);
        // console.log(scriptFile, finalScriptCode)
        this.emitFile(path.join('web', scriptFilePath), finalScriptCode);
        // console.log('scriptFilePath', finalScriptCode)
    }

    // Replace the <template> and <script> sections with the compiled code
    const finalCode = source
        .replace(templateMatch[0], '')
        .replace(scriptMatch[0], `import { AComponent } from 'facade/server';\n\n` + componentCode.code + `\n\nexport default ${className};\n`);

    // Generate the source map
    const sourceMap = componentCode.map;
    sourceMap.sources = [this.resourcePath];
    sourceMap.sourcesContent = [source];

    // console.log('finalCode', finalCode)
    // Pass the generated JavaScript code and source map to the next loader
    this.callback(null, finalCode, sourceMap);
};
