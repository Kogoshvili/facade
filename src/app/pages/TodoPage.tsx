import Header from 'layouts/header'
import Body from 'layouts/body'
import TodoList from 'components/TodoList'

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

