import React from 'react';
import { renderToString } from 'react-dom/server';

function Page(path, Component) {
    return function() {
        return this.get(path, (req, res) => {
            const component = <Component />;
            const string = renderToString(component);
            res.send(string);
        })
    };
}

export default Page;

