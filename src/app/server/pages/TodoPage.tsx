import Header from 'server/layouts/header'
import Body from 'server/layouts/body'
import TodoList from 'server/components/TodoList'

function TodoPage() {
    return (
        <html>
            <Header name="Todo" />
            <Body>
                <TodoList />
            </Body>
        </html>
    )
}

export default TodoPage

