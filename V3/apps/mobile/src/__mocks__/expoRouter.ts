export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
}));

export const usePathname = jest.fn(() => '/');
export const useSearchParams = jest.fn(() => new URLSearchParams());
export const Link = 'Link';
export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};
