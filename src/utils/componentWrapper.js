function updateProperties(temp, props) {
    const compProperties = Object.getOwnPropertyNames(temp);
    for (const property of compProperties) {
        if (props[property]) {
            temp[property] = props[property];
        }
    }
    return temp;
}

function ComponentWrapper(comp) {
    return function (props) {
        const temp = new comp(props);

        if (!props) return temp;
        return updateProperties(temp, props);
    };
}

export default ComponentWrapper;
