import { FComponent } from 'facade/server'
import Modal from './Modal'

class Wrapper extends FComponent<any> {
    render() {
        return (
            <div>
                <Modal />
            </div>
        )
    }
}

export default Wrapper
