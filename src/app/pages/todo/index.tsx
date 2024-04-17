import Header from 'app/app/layout/header'
import TodoList from './components/TodoList'
import Body from 'app/app/layout/body'

function Page() {
    return (
        <html>
            <Header name="Todo" />
            <Body>
                <TodoList />
            </Body>
        </html>
    )
}

export default Page

