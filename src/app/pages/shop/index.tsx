import Modal from './components/Modal'
import ProductList from './components/ProductList'
import Header from 'app/app/layout/header'
import Body from 'app/app/layout/body'


function Page() {
    return (
        <html>
            <Header name="Shop" />
            <Body>
                <ProductList />
                <Modal />
            </Body>
        </html>
    )
}

export default Page

