declare global {
  interface FormData {
    append(name: string, value: string | Blob | FormDataFileValue): void;
  }

  interface FormDataFileValue {
    uri: string;
    name: string;
    type: string;
  }
}

export {};
