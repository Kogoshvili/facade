import React from 'react';
import { renderToString } from 'react-dom/server';

function Template(path, Component) {
    return function(props = {}) {
        if (this === undefined) {
            return <Component {...props}/>;
        }


        return this.get(path, (req, res) => {
            const props = req.query;
            const component = <Component {...props} />;
            const string = renderToString(component);
            res.send(string);
        })
    };
}

export default Template;

