function registerComponent(comp) {
    const methods = Object.getOwnPropertyNames(comp.prototype);
    methods.filter(getPublicMethods).forEach(registerEndpoint);
}

function getPublicMethods() {
    return method => method !== 'constructor' && typeof comp.prototype[method] === 'function'
};

function registerEndpoint(method) {
    app.post(`/${comp.name}.${method}`, (req, res) => {
        const result = comp.prototype[method].call({}, req.body);
        res.send(result);
    });
}

export default registerComponent;
