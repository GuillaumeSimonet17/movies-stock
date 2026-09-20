from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from msapp.models import Friendship, MovieRecommendation, Movie, MoviesList, MovieListItem


def friendship_user_data(user):
    return {'id': user.id, 'username': user.username}


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_request(request):
    username = request.data.get('username', '').strip()
    if not username:
        return Response({'error': 'username requis'}, status=400)

    if username == request.user.username:
        return Response({'error': 'Vous ne pouvez pas vous ajouter vous-même'}, status=400)

    try:
        to_user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=404)

    existing = Friendship.objects.filter(from_user=request.user, to_user=to_user).first()
    if existing:
        if existing.status == 'pending':
            return Response({'error': 'Demande déjà envoyée'}, status=409)
        elif existing.status == 'accepted':
            return Response({'error': 'Vous êtes déjà amis'}, status=409)
        elif existing.status == 'declined':
            existing.status = 'pending'
            existing.save()
            return Response({'message': f'Demande renvoyée à {username}'}, status=200)

    if Friendship.objects.filter(from_user=to_user, to_user=request.user).exists():
        return Response({'error': 'Cet utilisateur vous a déjà envoyé une demande'}, status=409)

    Friendship.objects.create(from_user=request.user, to_user=to_user)
    return Response({'message': f'Demande envoyée à {username}'}, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_request(request, friendship_id):
    action = request.data.get('action')  # 'accept' ou 'decline'
    try:
        friendship = Friendship.objects.get(id=friendship_id, to_user=request.user, status='pending')
    except Friendship.DoesNotExist:
        return Response({'error': 'Demande introuvable'}, status=404)

    if action == 'accept':
        friendship.status = 'accepted'
        friendship.save()
        return Response({'message': 'Demande acceptée'})
    elif action == 'decline':
        friendship.status = 'declined'
        friendship.save()
        return Response({'message': 'Demande refusée'})

    return Response({'error': 'action invalide (accept/decline)'}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_friends(request):
    friendships = Friendship.objects.filter(
        Q(from_user=request.user) | Q(to_user=request.user),
        status='accepted'
    )
    # Marquer les notifs d'acceptation comme vues
    Friendship.objects.filter(
        from_user=request.user, status='accepted', accepted_notified=False
    ).update(accepted_notified=True)
    friends = []
    for f in friendships:
        other = f.to_user if f.from_user == request.user else f.from_user
        friends.append({'id': f.id, 'user': friendship_user_data(other)})
    return Response({'friends': friends})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pending(request):
    received = Friendship.objects.filter(to_user=request.user, status='pending').select_related('from_user')
    sent = Friendship.objects.filter(from_user=request.user, status='pending').select_related('to_user')
    return Response({
        'received': [{'id': f.id, 'from': friendship_user_data(f.from_user), 'created_at': f.created_at} for f in received],
        'sent': [{'id': f.id, 'to': friendship_user_data(f.to_user), 'created_at': f.created_at} for f in sent],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    pending_received = Friendship.objects.filter(to_user=request.user, status='pending').count()
    unread_recos = MovieRecommendation.objects.filter(to_user=request.user, is_read=False).count()
    accepted_qs = Friendship.objects.filter(
        from_user=request.user, status='accepted', accepted_notified=False
    ).select_related('to_user')
    friend_accepted_list = [f.to_user.username for f in accepted_qs]
    friend_accepted = len(friend_accepted_list)
    return Response({
        'pending_received': pending_received,
        'unread_recos': unread_recos,
        'friend_accepted': friend_accepted,
        'friend_accepted_list': friend_accepted_list,
        'total': pending_received + unread_recos + friend_accepted,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_recommendation(request):
    to_user_id = request.data.get('to_user_id')
    movie_id = request.data.get('movie_id')

    if not to_user_id or not movie_id:
        return Response({'error': 'to_user_id et movie_id requis'}, status=400)

    # Vérifier que c'est bien un ami
    is_friend = Friendship.objects.filter(
        Q(from_user=request.user, to_user_id=to_user_id) |
        Q(from_user_id=to_user_id, to_user=request.user),
        status='accepted'
    ).exists()
    if not is_friend:
        return Response({'error': 'Cet utilisateur n\'est pas dans vos amis'}, status=403)

    try:
        to_user = User.objects.get(id=to_user_id)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable'}, status=404)

    # Récupérer les infos du film depuis la DB si dispo, sinon depuis les données envoyées
    movie = Movie.objects.filter(movie_id=movie_id).first()
    if movie:
        title = movie.title
        poster_path = movie.poster_path
        release_date = str(movie.release_date) if movie.release_date else ''
        vote_average = movie.vote_average
    else:
        title = request.data.get('title', '')
        poster_path = request.data.get('poster_path', '')
        release_date = request.data.get('release_date', '')
        vote_average = request.data.get('vote_average')

    MovieRecommendation.objects.create(
        from_user=request.user,
        to_user=to_user,
        movie_id=movie_id,
        title=title,
        poster_path=poster_path,
        release_date=release_date,
        vote_average=vote_average,
    )
    return Response({'message': f'"{title}" recommandé à {to_user.username}'}, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommendations(request):
    recos = MovieRecommendation.objects.filter(
        to_user=request.user, is_declined=False
    ).select_related('from_user').order_by('-created_at')

    # Marquer comme lues
    recos.filter(is_read=False).update(is_read=True)

    # IDs déjà dans la wishlist
    wishlist_ids = set(
        MovieListItem.objects.filter(
            movies_list__user=request.user,
            movies_list__is_collection=True
        ).values_list('movie__movie_id', flat=True)
    )

    return Response({'recommendations': [
        {
            'id': r.id,
            'from': r.from_user.username,
            'movie_id': r.movie_id,
            'title': r.title,
            'poster_path': r.poster_path,
            'release_date': r.release_date,
            'vote_average': r.vote_average,
            'created_at': r.created_at,
            'in_wishlist': r.movie_id in wishlist_ids,
        }
        for r in recos
    ]})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sent_recommendations(request):
    recos = MovieRecommendation.objects.filter(
        from_user=request.user
    ).select_related('to_user').order_by('-created_at')

    # Collecter les movie_ids dans la wishlist de chaque destinataire
    to_user_ids = list(set(r.to_user_id for r in recos))
    wishlist_pairs = set(
        MovieListItem.objects.filter(
            movies_list__user_id__in=to_user_ids,
            movies_list__is_collection=True,
        ).values_list('movies_list__user_id', 'movie__movie_id')
    )

    return Response({'recommendations': [
        {
            'id': r.id,
            'to': r.to_user.username,
            'movie_id': r.movie_id,
            'title': r.title,
            'poster_path': r.poster_path,
            'release_date': r.release_date,
            'vote_average': r.vote_average,
            'created_at': r.created_at,
            'in_wishlist': (r.to_user_id, r.movie_id) in wishlist_pairs,
            'is_declined': r.is_declined,
        }
        for r in recos
    ]})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_recommendation(request, reco_id):
    try:
        reco = MovieRecommendation.objects.get(id=reco_id, to_user=request.user)
        reco.is_declined = True
        reco.save(update_fields=['is_declined'])
        return Response({'message': 'Refusée'})
    except MovieRecommendation.DoesNotExist:
        return Response({'error': 'Introuvable'}, status=404)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_friend(request, friendship_id):
    try:
        friendship = Friendship.objects.get(
            Q(from_user=request.user) | Q(to_user=request.user),
            id=friendship_id
        )
        friendship.delete()
        return Response({'message': 'Ami supprimé'})
    except Friendship.DoesNotExist:
        return Response({'error': 'Introuvable'}, status=404)
