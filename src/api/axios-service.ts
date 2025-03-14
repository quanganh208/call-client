import axios from 'axios';
import queryString from 'query-string';

const axiosService = axios.create({
    paramsSerializer: params => queryString.stringify(params),
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
axiosService.interceptors.request.use(async (config: any) => {
    config.headers = {
        ...config.headers,
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    config.data;
    return config;
});

axiosService.interceptors.response.use(
    response => {
        if (200 <= response.status && response.status < 300) {
            return response.data;
        }
        return Promise.reject({
            status: response.status,
            message: response.data.message,
        });
    },
    error => {
        let errorMessage = 'An error occurred';
        let status = 500;
        if (error.response) {
            errorMessage = error.response.data.message;
            status = error.response.status;
        }
        return Promise.reject({
            status: status,
            message: errorMessage,
        });
    },
);

export default axiosService;
