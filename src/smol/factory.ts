function updateProperties(temp: any, props: Record<string, any>) {
    const compProperties = Object.getOwnPropertyNames(temp);
    for (const property of compProperties) {
        if (props[property]) {
            temp[property] = props[property];
        }
    }
    return temp;
}

function makeComponent(component: any, props: any) {
    const temp = new component(props);
    return updateProperties(temp, props);
}

export default makeComponent;
