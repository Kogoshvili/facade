import x from './someting.js'

class Component {
    constructor() {
        this.state = {
            title: 'Product Listing'
        }
    }

    handleClick() {
        this.state.title = 'Button Clicked';
        console.log('Button Clicked');
    }

    render() {
        return `
            <div>
                <h1>${this.state.title}</h1>
                <button onclick="handleClick()">Click Me</button>
            </div>{{
            }}
        `;
    }
}

/*
<template>
    <div>
        <h1>{{ title }}</h1>
        <button @click="handleClick">Click Me</button>
    </div>
</template>
*/

// I can run this on server and get rendered html output
// I can remove render method and use this as a template
