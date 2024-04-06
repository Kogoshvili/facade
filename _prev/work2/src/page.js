import Handlebars from "handlebars";
const template = Handlebars.compile("Name: {{name}}");
console.log(template({ name: "Nils" }));


function Page(filePath) {
    // read contents of the file
    const content = fs.readFileSync(filePath, 'utf8');
    // compile the content into a template
    const template = Handlebars.compile(content);
    // return a function that renders the template with the given data
    return function(data) {
        return template(data);
        (req, res) => {
            const component = <Component />;
            const string = renderToString(component);
            res.send(string);
        })
    };
}

export default Page;

