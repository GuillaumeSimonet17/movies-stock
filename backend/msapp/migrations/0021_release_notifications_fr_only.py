from zoneinfo import ZoneInfo

from django.db import migrations, models

PARIS_TZ = ZoneInfo('Europe/Paris')


def clean_release_notifications(apps, schema_editor):
    MovieNotification = apps.get_model('msapp', 'MovieNotification')
    MovieListItem = apps.get_model('msapp', 'MovieListItem')

    # US release notifications are dropped
    MovieNotification.objects.filter(kind='release_us').delete()

    seen = set()
    for n in MovieNotification.objects.filter(kind='release_fr').select_related('movie').order_by('id'):
        key = (n.user_id, n.movie_id)
        if key in seen:  # duplicate
            n.delete()
            continue
        seen.add(key)
        if n.is_read:
            continue
        # Unread notification for a movie added on/after its French release: not relevant
        added = [
            item.added_at.astimezone(PARIS_TZ).date()
            for item in MovieListItem.objects.filter(
                movie_id=n.movie_id, movies_list__user_id=n.user_id, movies_list__is_collection=True,
            )
        ]
        if not added or not n.movie.fr_release_date or min(added) >= n.movie.fr_release_date:
            n.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('msapp', '0020_movienotification_release_kinds'),
    ]

    operations = [
        migrations.RunPython(clean_release_notifications, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='movienotification',
            name='kind',
            field=models.CharField(choices=[('netflix', 'Arrivé sur Netflix'), ('release_fr', 'Sortie en France')], max_length=20),
        ),
        migrations.AddConstraint(
            model_name='movienotification',
            constraint=models.UniqueConstraint(condition=models.Q(('kind', 'release_fr')), fields=('user', 'movie', 'kind'), name='unique_release_notification'),
        ),
    ]
