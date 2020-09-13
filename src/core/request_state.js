class SafirRequestStateListener {

    constructor(request) {
        this.request = request;
        this.xhr = request.xhr;
    }

    onChange(state) {

        switch (state) {
            case XMLHttpRequest.OPENED:
                // request headers can be updated here
                for (const header in this.request.headers) {
                    this.xhr.setRequestHeader(header, this.request.headers[header]);
                }
                break;
            case XMLHttpRequest.HEADERS_RECEIVED:
                if (this.request.response_handlers.length > 0) {
                    for (let i in this.request.response_handlers) {
                        let handler = this.request.response_handlers[i];
                        if (handler.on_http_sent) {
                            handler.on_http_sent.call(handler);
                        }
                    }
                }
                break;
            case XMLHttpRequest.LOADING:
                break;
            case XMLHttpRequest.DONE:

                if (this.request.response_handlers.length > 0) {

                    let response_json = null;
                    for (let i in this.request.response_handlers) {
                        let handler = this.request.response_handlers[i];
                        if (handler) {

                            try {
                                response_json = JSON.parse(this.xhr.responseText);
                            } catch (error) {
                                console.log(error);
                            }

                            if (this.xhr.status >= 200 && this.xhr.status < 400) {
                                if (handler.on_http_success) {
                                    handler.on_http_success.call(handler, this.xhr.status, response_json, this.xhr.responseText);
                                }

                            } else if (this.xhr.status >= 400) {
                                if (handler.on_http_error) {
                                    handler.on_http_error.call(handler, this.xhr.status, response_json, this.xhr.responseText);
                                }
                            }
                        }
                    }
                }
                break;
        }
    }
}
