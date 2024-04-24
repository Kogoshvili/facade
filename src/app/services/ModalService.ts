import { signal, ISignal, Injectable } from 'facade/server'

@Injectable()
class ModalService {
    modal: ISignal<string|null> = signal(null)

    openModal(data: any) {
        this.modal(data)
    }

    closeModal() {
        this.modal(null)
    }
}

export default ModalService
