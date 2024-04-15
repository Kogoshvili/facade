function secretHolder(value) {
    let secret = value

    return (v) => {
        if (v !== undefined) {
            secret = v;
        }

        return secret;
    }
}

function Component() {
    const obj = secretHolder(5);
    console.log(obj()); // 5


    return null
}





Component()
