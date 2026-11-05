import React, { useId } from 'react';

export interface NanasoreLogoProps {
  /**
   * - 'iconOnly': Uniquement l'emblème vectoriel "N" + Passerelle + Flèche ascendante
   * - 'compact': Icône + "Nanasore" sur une ligne (idéal pour barre mobile)
   * - 'horizontal': Icône + "Nanasore" + sous-titre "La Voie Facile" à droite
   * - 'full': Format vertical (Icône au-dessus + "Nanasore" + "La Voie Facile" centré, comme sur l'affiche officielle)
   */
  variant?: 'iconOnly' | 'compact' | 'horizontal' | 'full';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light';
  showTagline?: boolean;
  tagline?: string;
  withSquircleBg?: boolean;
  className?: string;
}

/**
 * Emblème vectoriel pur "La Passerelle de la Fluidité" (Le grand « N » bicolore Bleu Royal & Blanc Pur,
 * les câbles de la passerelle suspendue et la flèche courbe 3D ascendante Bleu Royal -> Cyan).
 */
export const NanasorePasserelleIcon: React.FC<{
  pixelSize?: number;
  withSquircleBg?: boolean;
  className?: string;
}> = ({ pixelSize = 40, withSquircleBg = false, className = '' }) => {
  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 ${className}`}
      role="img"
      aria-label="Nanasore"
    >
      {withSquircleBg && (
        <rect width="1024" height="1024" rx="228" fill="#FFFFFF" />
      )}
      <path
        d="M 786.3 227.8 C 770.2 235.9, 735 253.5, 708 267 C 681.1 280.4, 659 291.8, 659 292.1 C 659 292.5, 660.2 293.3, 661.8 293.8 C 665.2 295.1, 704.3 313.1, 705 313.6 C 705.6 314.2, 701 322.6, 698.7 325.1 C 697.7 326.1, 697.2 327, 697.5 327 C 699.9 327, 656.6 390.2, 645.4 403 C 644.7 403.8, 641 408.1, 637.3 412.5 C 625.6 426.3, 623.1 429.1, 605.5 446.6 C 588.3 463.6, 574.3 476.2, 559.7 487.5 C 555.4 490.8, 550.2 494.9, 548.1 496.5 C 540.7 502.5, 519.7 516.7, 506.5 524.7 L 492.9 532.8 482.7 530.1 C 467.9 526.1, 441 513.7, 441 510.8 C 441 510.4, 440.4 510, 439.8 510 C 439.1 510, 436.3 508, 433.6 505.5 C 431 503, 428.4 501, 428 501 C 426.5 501, 411 483.4, 405.3 475.4 C 393.3 458.1, 383.1 431.6, 383 417.5 C 383 408.4, 389.5 400.6, 395.2 403 C 399.6 404.8, 409.5 417.3, 417.1 430.7 C 418.4 433, 425.6 445.6, 433.1 458.7 C 440.6 471.8, 448.5 485.7, 450.5 489.5 C 452.6 493.4, 456 499.2, 458 502.5 C 460 505.8, 463.8 512.4, 466.5 517.3 C 469.2 522.1, 471.7 526, 472.2 526 C 472.8 526, 483.2 520.7, 494.5 514.6 C 499.2 512, 521.7 497.5, 524 495.5 C 527.8 492.1, 536.4 486.5, 537.3 486.8 C 538.7 487.2, 538 483.4, 535.9 480 C 532.6 474.6, 499 415.9, 499 415.5 C 499 415.4, 497.3 412.3, 495.1 408.9 C 493 405.4, 486.2 393.7, 480 383 C 463.6 354.5, 448.4 331, 440.8 322.2 C 421.1 299.4, 401.8 289.7, 376.5 289.7 C 350 289.7, 331 299.8, 314.9 322.4 C 301.8 340.9, 298.1 363, 298 423.5 C 298 450.3, 297.7 455.7, 296 463 C 285.2 511.4, 253.5 547.9, 211.8 560.1 L 204 562.4 204 569.2 C 204 575.7, 204.1 576, 206.4 576 C 208.6 576, 222.3 572.2, 226.3 570.5 C 227.9 569.8, 228 570.7, 228 580.9 L 228 592 223.3 591.4 C 220.6 591.1, 215.2 590.4, 211.1 589.9 C 207 589.4, 203.4 589.2, 203.2 589.5 C 202.7 590, 206.8 593.4, 208 593.5 C 208.3 593.6, 210.8 594.6, 213.5 595.9 C 235.3 605.8, 262.4 614.6, 286.2 619.2 C 292.4 620.4, 297.6 621.7, 297.8 622 C 297.9 622.4, 298.2 643.1, 298.3 668.1 L 298.5 713.5 339.8 713.8 L 381 714 381 669.6 L 381 625.2 383.8 624.6 C 385.3 624.4, 389.7 623.8, 393.5 623.5 C 447.1 618.7, 515.1 596, 567.6 565.4 C 569.8 564.1, 572.1 563.3, 572.6 563.8 C 573.1 564.2, 573.2 564.1, 572.8 563.6 C 572.4 563.1, 576.9 559.8, 582.8 556.3 C 625.8 530.5, 671.7 492.7, 706.3 454.5 C 710.8 449.6, 716.4 443.5, 718.7 441 C 731.3 427.5, 759.4 390.5, 771 372.2 C 774.6 366.6, 778 362, 778.5 362 C 779.5 362, 785.9 367.2, 807.8 385.8 C 814.6 391.5, 820.3 396.1, 820.5 395.8 C 820.7 395.6, 820.3 367.8, 819.5 334 C 818.7 300.2, 817.8 259.1, 817.4 242.8 C 817.1 226.4, 816.5 213, 816.1 213 C 815.8 213.1, 802.4 219.7, 786.3 227.8 M 563 371.7 C 562.9 415.1, 562.7 453.8, 562.4 457.8 C 562.1 461.7, 562.2 465, 562.7 465 C 566.5 464.9, 614 417.5, 630.5 397.3 C 633.7 393.3, 636.7 390, 637 390 C 637.3 390, 638.3 388.7, 639.2 387.2 C 640.7 384.6, 640.9 379.4, 641 338.9 L 641.2 293.5 602.1 293.2 L 563 293 563 371.7 M 714.2 468.3 C 697.9 486.6, 672.4 510.4, 648.8 529.3 L 644 533.1 644 561.4 C 644 577, 643.5 592.2, 643 595.1 C 640.1 610.6, 630.6 618.6, 621.6 613.1 C 615.1 609, 601.1 590.9, 593.9 577 C 590.7 570.8, 589.7 570.4, 584.8 573.3 C 571.6 581.1, 550.4 592.7, 543 596.2 C 538.3 598.4, 531.7 601.6, 528.3 603.2 L 522.1 606.1 526.4 613.3 C 532.2 623, 549.1 650.8, 551.5 654.5 C 558.4 665.6, 561.1 669.4, 566.6 676.5 C 581.6 695.8, 600.5 709.4, 619.5 714.6 C 629.9 717.4, 650.3 717.6, 661.3 715.1 C 697.7 706.7, 721.2 675.5, 724.6 631 C 725.6 618.5, 725.8 457, 724.9 457 C 724.5 457, 719.7 462.1, 714.2 468.3 M 381 520.5 C 381 565, 381.3 577, 382.3 577 C 382.9 577, 388 575.6, 393.4 574 C 398.9 572.3, 403.5 571, 403.7 571 C 403.8 571, 404 554.2, 404 533.7 C 404 496.9, 404 496.3, 401.9 494.4 C 399.1 491.9, 387.8 474.8, 384.9 468.8 C 383.6 466.1, 382.2 464, 381.8 464 C 381.4 464, 381 489.4, 381 520.5 M 292.7 511 C 290.6 514.9, 287.4 519.9, 285.7 522.3 C 278.5 531.8, 279 528.9, 279 562 L 279 592 285.4 592 C 288.9 592, 293.2 591.7, 294.9 591.4 L 298 590.8 298 547.4 C 298 523.5, 297.7 504, 297.3 504 C 296.8 504, 294.8 507.2, 292.7 511 M 418 538.2 C 418 552.8, 418.2 564.9, 418.5 565.2 C 418.8 565.5, 423.5 564.1, 428.8 562.1 L 438.5 558.4 438.8 542.7 L 439.1 527 433.6 523.5 C 430.7 521.6, 427.6 519.5, 426.9 518.8 C 426.1 518, 423.8 516.2, 421.8 514.6 L 418 511.8 418 538.2 M 454 543.5 C 454 548, 454.4 551, 455 551 C 456.7 551, 472 543.8, 472 543 C 472 542.4, 456.3 536, 454.8 536 C 454.3 536, 454 539.4, 454 543.5 M 260.4 550.1 C 259.4 551.3, 255 554.7, 250.8 557.7 L 243 563.1 243 578.1 L 243 593 253.5 593 L 264 593 264.1 584.5 C 264.4 558.6, 264.1 548, 263.2 548 C 262.7 548, 261.5 548.9, 260.4 550.1"
        fill="#00AEEF"
        fillRule="evenodd"
      />
    </svg>
  );
};

/**
 * Composant Officiel Global <NanasoreLogo />
 * "Nanasore — La Passerelle de la Fluidité (La Voie Facile)"
 */
export const NanasoreLogo: React.FC<NanasoreLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  theme = 'dark',
  showTagline = false,
  tagline = '',
  withSquircleBg = true,
  className = '',
}) => {
  const sizeMap = {
    xs: {
      icon: 28,
      titleClass: 'text-sm',
      taglineClass: 'text-[8px]',
      gap: 'gap-2',
    },
    sm: {
      icon: 34,
      titleClass: 'text-base sm:text-lg',
      taglineClass: 'text-[9px]',
      gap: 'gap-2.5',
    },
    md: {
      icon: 42,
      titleClass: 'text-lg sm:text-xl',
      taglineClass: 'text-[10px]',
      gap: 'gap-3',
    },
    lg: {
      icon: 58,
      titleClass: 'text-2xl sm:text-3xl',
      taglineClass: 'text-xs',
      gap: 'gap-3.5',
    },
    xl: {
      icon: 84,
      titleClass: 'text-3xl sm:text-4xl',
      taglineClass: 'text-sm',
      gap: 'gap-4',
    },
  }[size];

  if (variant === 'iconOnly') {
    return (
      <NanasorePasserelleIcon
        pixelSize={sizeMap.icon}
        withSquircleBg={withSquircleBg}
        className={className}
      />
    );
  }

  const nanaColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const soreColor = theme === 'dark' ? 'text-[#22D3EE]' : 'text-[#0284C7]';
  const taglineColor = theme === 'dark' ? 'text-slate-200/90' : 'text-slate-600';

  if (variant === 'full') {
    return (
      <div className={`inline-flex flex-col items-center text-center select-none ${sizeMap.gap} ${className}`}>
        <NanasorePasserelleIcon pixelSize={sizeMap.icon} withSquircleBg={withSquircleBg} />
        <div className="flex flex-col items-center leading-none">
          <div className={`font-black tracking-tight flex items-baseline ${sizeMap.titleClass}`}>
            <span className={nanaColor}>Nana</span>
            <span className={soreColor}>sore</span>
          </div>
          {showTagline && (
            <span className={`font-semibold tracking-wide mt-1 ${sizeMap.taglineClass} ${taglineColor}`}>
              {tagline}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 'compact' ou 'horizontal'
  return (
    <div className={`inline-flex items-center select-none ${sizeMap.gap} ${className}`}>
      <NanasorePasserelleIcon pixelSize={sizeMap.icon} withSquircleBg={withSquircleBg} />
      <div className="flex flex-col justify-center min-w-0 leading-none">
        <div className={`font-black tracking-tight flex items-baseline truncate ${sizeMap.titleClass}`}>
          <span className={nanaColor}>Nana</span>
          <span className={soreColor}>sore</span>
        </div>
        {variant !== 'compact' && showTagline && (
          <span className={`font-semibold tracking-wide truncate mt-0.5 ${sizeMap.taglineClass} ${taglineColor}`}>
            {tagline}
          </span>
        )}
      </div>
    </div>
  );
};

export default NanasoreLogo;
