<script>
    const handleAdd = () => {
        console.log('TEST')
    }
</script>

<template>
    <div class="p-5">
        <h1 class="text-2xl font-bold mb-4">Todo List</h1>
        <div class="mb-4">
            <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" value:bind="this.inputValue" placeholder="Add new todo" />
            <button class="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" onClick={this.handleAdd}>Add Todo</button>
        </div>
        <ul class="list-none">
        </ul>
    </div>
</template>
