import { useState } from 'react';
import QRCode from 'qrcode';
import {
  Copy,
  DownloadSimple,
  Image as ImageIcon,
  Lightning,
  WechatLogo,
} from '@phosphor-icons/react';
import { money, monthLabel } from '../model.js';
import Modal from './Modal.jsx';

const COPYRIGHT = 'Taikonaut';

function inWeChat() {
  return /MicroMessenger/i.test(navigator.userAgent);
}

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const done = document.execCommand('copy');
    area.remove();
    return done;
  }
}

function fitFont(context, text, maxWidth, startSize, weight = '') {
  let size = startSize;
  while (size > 20) {
    context.font = `${weight}${size}px "Index Serif", "Songti SC", serif`;
    if (context.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

async function buildShareImage(group, url) {
  await document.fonts.ready;
  const width = 1080;
  const height = 1440;
  const pad = 88;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  context.fillStyle = '#f5f3ed';
  context.fillRect(0, 0, width, height);

  context.fillStyle = '#282b24';
  context.textBaseline = 'alphabetic';
  context.font = '52px "Index Serif", "Songti SC", serif';
  context.fillText('来了就住深', pad, 150);

  context.textAlign = 'right';
  context.fillStyle = '#7e8076';
  context.font = '19px -apple-system, "PingFang SC", sans-serif';
  context.fillText('SHENZHEN / RENTAL INDEX', width - pad, 143);
  context.textAlign = 'left';

  context.strokeStyle = '#c9c9be';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(pad, 196);
  context.lineTo(width - pad, 196);
  context.stroke();

  context.fillStyle = '#70764e';
  context.font = '22px -apple-system, "PingFang SC", sans-serif';
  context.fillText('RESIDENTIAL ARCHIVE', pad, 276);

  context.fillStyle = '#282b24';
  const nameSize = fitFont(context, group.name, width - pad * 2, 104, '');
  context.font = `${nameSize}px "Index Serif", "Songti SC", serif`;
  context.fillText(group.name, pad, 276 + nameSize + 42);

  context.fillStyle = '#7e8076';
  context.font = '30px -apple-system, "PingFang SC", sans-serif';
  const place = [group.district, group.street || group.area].filter(Boolean).join(' · ');
  context.fillText(place, pad, 276 + nameSize + 100);

  context.fillStyle = '#70764e';
  context.font = '22px -apple-system, "PingFang SC", sans-serif';
  context.fillText('最新成交月租', pad, 640);

  const rent = `${money(group.min)}${group.max > group.min ? ` – ${money(group.max)}` : ''}`;
  context.fillStyle = '#282b24';
  context.font = '80px "Baskerville", "Times New Roman", serif';
  context.fillText(`¥${rent}`, pad, 730);

  const rentWidth = context.measureText(`¥${rent}`).width;
  context.fillStyle = '#7e8076';
  context.font = '28px -apple-system, "PingFang SC", sans-serif';
  context.fillText('/ 月', pad + rentWidth + 18, 730);

  context.fillStyle = '#7e8076';
  context.font = '24px -apple-system, "PingFang SC", sans-serif';
  const meta = [
    group.latestMonth ? monthLabel(group.latestMonth) : '',
    group.areaMin
      ? `${group.areaMin}${group.areaMax > group.areaMin ? `–${group.areaMax}` : ''}㎡`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');
  context.fillText(meta, pad, 782);

  context.strokeStyle = '#c9c9be';
  context.beginPath();
  context.moveTo(pad, 880);
  context.lineTo(width - pad, 880);
  context.stroke();

  context.fillStyle = '#282b24';
  context.font = '32px "Index Serif", "Songti SC", serif';
  context.fillText('扫码打开这个小区', pad, 990);
  context.fillStyle = '#7e8076';
  context.font = '22px -apple-system, "PingFang SC", sans-serif';
  context.fillText('查看各月成交区间与每笔成交明细', pad, 1040);
  context.fillStyle = '#9a9c92';
  context.font = '18px -apple-system, "PingFang SC", sans-serif';
  const shortUrl = url.replace(/^https?:\/\//, '').split(/[/#]/)[0];
  context.fillText(shortUrl, pad, 1086);

  const qrData = await QRCode.toDataURL(url, {
    margin: 1,
    width: 300,
    color: { dark: '#282b24ff', light: '#ffffffff' },
  });
  const qr = new Image();
  qr.src = qrData;
  await qr.decode();
  const cardSize = 268;
  const cardX = width - pad - cardSize;
  const cardY = height - pad - cardSize - 12;
  context.fillStyle = '#ffffff';
  roundedRect(context, cardX, cardY, cardSize, cardSize, 6);
  context.fill();
  context.strokeStyle = '#d8d8cc';
  context.stroke();
  context.drawImage(qr, cardX + 14, cardY + 14, cardSize - 28, cardSize - 28);

  context.fillStyle = '#9a9c92';
  context.font = '19px -apple-system, "PingFang SC", sans-serif';
  context.fillText(`© ${new Date().getFullYear()} ${COPYRIGHT} · 数据仅供参考`, pad, height - 44);

  return canvas.toDataURL('image/png');
}

export default function ShareSheet({ group, onClose, onToast }) {
  const [guide, setGuide] = useState('');
  const [image, setImage] = useState('');
  const [busy, setBusy] = useState(false);
  const url = window.location.href;

  const copyLink = async () => {
    const done = await writeClipboard(url);
    onToast(done ? '链接已复制' : '复制失败，请手动选择地址栏链接');
  };

  const shareWeChat = async () => {
    await writeClipboard(url);
    setGuide(
      inWeChat()
        ? '链接已复制。在微信里点右上角「···」，选择「分享给朋友」，或者直接粘贴发送。'
        : '链接已复制。打开微信粘贴发给朋友；如果想用微信自带的分享卡片，请在微信里打开本站后点右上角「···」。',
    );
  };

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      setImage(await buildShareImage(group, url));
    } catch {
      onToast('生成分享图片失败，可以先用复制链接');
    } finally {
      setBusy(false);
    }
  };

  const fileName = `来了就住深-${group.name}.png`;

  return (
    <Modal title="分享这个小区" onClose={onClose}>
      <p className="share-lead">
        {group.name}
        <span>{[group.district, group.street || group.area].filter(Boolean).join(' · ')}</span>
      </p>
      <div className="share-actions">
        <button onClick={copyLink}>
          <Copy size={22} />
          复制链接
        </button>
        <button onClick={shareWeChat}>
          <WechatLogo size={22} />
          微信
        </button>
        <button onClick={generate} disabled={busy} aria-busy={busy}>
          <ImageIcon size={22} />
          {busy ? '生成中…' : '生成分享图片'}
        </button>
      </div>
      {guide && (
        <p className="share-guide">
          <Lightning size={16} />
          {guide}
        </p>
      )}
      {image && (
        <div className="share-preview">
          <img src={image} alt={`${group.name}的分享图片，含打开详情的二维码`} />
          <a className="share-download" href={image} download={fileName}>
            <DownloadSimple size={18} />
            保存图片
          </a>
          <p>手机上也可以长按图片保存。</p>
        </div>
      )}
    </Modal>
  );
}
