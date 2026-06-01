// Auto-scroll an expertise card into view when its description expands.
document.addEventListener('DOMContentLoaded', function () {
    const collapses = document.querySelectorAll('#skillsAccordion .collapse');

    collapses.forEach(collapse => {
        collapse.addEventListener('shown.bs.collapse', function () {
            const card = collapse.closest('.card');
            const rect = card.getBoundingClientRect();

            const fullyVisible =
                rect.top >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);

            if (!fullyVisible) {
                card.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        });
    });
});
