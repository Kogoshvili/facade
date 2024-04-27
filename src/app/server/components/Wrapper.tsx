import { AComponent } from 'facade/server'
import Modal from './Modal'

class Wrapper extends AComponent<any> {
    static render() {
        return (
            <div>
                <Modal />
            </div>
        )
    }
}

export default Wrapper
