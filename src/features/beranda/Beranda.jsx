import { useIsDesktop } from '../../hooks/useMediaQuery';
import BerandaMobile from './BerandaMobile';
import BerandaDesktop from './BerandaDesktop';

export default function Beranda() {
  const desktop = useIsDesktop();
  return desktop ? <BerandaDesktop /> : <BerandaMobile />;
}
