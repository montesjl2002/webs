document.addEventListener('DOMContentLoaded', function () {
    const btnYes = document.getElementById('btnYes');
    const btnNo = document.getElementById('btnNo');
    const noMessage = document.getElementById('noMessage');
    const modal = document.getElementById('modal');
    const closeModal = document.getElementById('closeModal');
    const modalBtn = document.getElementById('modalBtn');
    const heartsContainer = document.getElementById('hearts');

    // Mueve el botón "No" aleatoriamente en la pantalla
    function moveButtonRandomly() {
        const maxX = window.innerWidth - btnNo.offsetWidth;
        const maxY = window.innerHeight - btnNo.offsetHeight;

        const randomX = Math.random() * maxX;
        const randomY = Math.random() * maxY;

        btnNo.style.left = `${randomX}px`;
        btnNo.style.top = `${randomY}px`;
    }

    // Mover cada segundo automáticamente
    setInterval(moveButtonRandomly, 1000);

    // Mover cuando se pasa el mouse por encima
    btnNo.addEventListener('mouseover', () => {
        moveButtonRandomly();
        noMessage.style.display = 'block';
    });

    // Mensaje si se intenta hacer clic en "No"
    btnNo.addEventListener('click', function () {
        noMessage.style.display = 'block';
        noMessage.style.animation = 'shake 0.5s';

        setTimeout(() => {
            noMessage.style.animation = 'none';
            void noMessage.offsetWidth;
            noMessage.style.animation = 'shake 0.5s';
        }, 10);
    });

    // Aceptar: mostrar modal y corazones
    btnYes.addEventListener('click', function () {
        modal.style.display = 'flex';
        createHearts();
    });

    closeModal.addEventListener('click', function () {
        modal.style.display = 'none';
    });

    modalBtn.addEventListener('click', function () {
        modal.style.display = 'none';
        createHearts();
    });

    function createHearts() {
        heartsContainer.innerHTML = '';

        for (let i = 0; i < 50; i++) {
            const heart = document.createElement('div');
            heart.classList.add('heart');
            heart.innerHTML = '❤';
            heart.style.left = Math.random() * 100 + '%';
            heart.style.top = Math.random() * 100 + '%';
            heart.style.fontSize = (Math.random() * 20 + 10) + 'px';
            heart.style.animationDuration = (Math.random() * 3 + 2) + 's';
            heart.style.animationDelay = Math.random() * 2 + 's';

            heartsContainer.appendChild(heart);
        }
    }

    createHearts();
});
