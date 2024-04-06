function Component({ view, name}) {
    return function(target) {
        const absolutePath = `C:/projects/FS-Framework/controller/${view}/${view}.html`
        target.prototype._viewPath = absolutePath;
        target.prototype._name = name;
        return target;
    }
}

export { Component }
