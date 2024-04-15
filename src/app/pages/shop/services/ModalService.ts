import { Injectable } from 'app/facade/server/Injection'
import { Subject } from 'rxjs'

@Injectable()
class ModalService {
    modal$: Subject<any> = new Subject()

    openModal(data: any) {
        this.modal$.next(data)
    }

    closeModal() {
        this.modal$.next(null)
    }
}

export default ModalService
