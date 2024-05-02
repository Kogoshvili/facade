import { signal } from 'app/facade/server/Signals-fe'

<script>
    const counter = signal(0)

    function recived(props) {
        this.onClick = props.onClick
        this.text = props.text
    }

    function handleClick() {
        this.counter(this.counter() + 1)
        if (this.counter() >= 10) {
            facade.callback(this.onClick)
        }
    }
</script>

<template>
    <button onClick={this.handleClick}>{this.text}{this.counter()}</button>
</template>
