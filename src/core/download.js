class SafirDownloadRequestListener {
    constructor(request) {
        this.request = request;
        this.xhr = request.xhr;
        this.xhr.onprogress = this.onProgress.bind(this);
        this.xhr.onabort = this.onAbort.bind(this);
        this.xhr.onerror = this.onError.bind(this);
        this.xhr.ontimeout = this.onTimeout.bind(this);
    }

    onProgress(event) {
        for (let i in this.request.response_handlers) {
            let handler = this.request.response_handlers[i];
            if (handler) {
                if(handler.on_download_progress) {
                    handler.on_download_progress.call(handler, event);
                } else if(handler.on_progress) {
                    handler.on_progress.call(handler, event);
                }
            }
        }
    }

    onAbort(event) {
        for (let i in this.request.response_handlers) {
            let handler = this.request.response_handlers[i];
            if (handler && handler.on_abort) {
                handler.on_abort.call(handler, event);
            }
        }
    }

    onError(event) {
        for (let i in this.request.response_handlers) {
            let handler = this.request.response_handlers[i];
            if (handler && handler.on_http_error) {
                handler.on_http_error.call(handler, event);
            }
        }
    }

    onTimeout(event) {
        for (let i in this.request.response_handlers) {
            let handler = this.request.response_handlers[i];
            if (handler && handler.on_timeout) {
                handler.on_timeout.call(handler, event);
            }
        }
    }
}