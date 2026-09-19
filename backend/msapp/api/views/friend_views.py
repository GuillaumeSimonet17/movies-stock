from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from msapp.models import Friendship


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

    if Friendship.objects.filter(from_user=request.user, to_user=to_user).exists():
        return Response({'error': 'Demande déjà envoyée'}, status=409)

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
    received_count = Friendship.objects.filter(to_user=request.user, status='pending').count()
    # Demandes envoyées qui viennent d'être acceptées (on lit et on marque comme "seen" via un simple count)
    accepted_count = Friendship.objects.filter(from_user=request.user, status='accepted').count()
    return Response({
        'pending_received': received_count,
        'total': received_count,
    })


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
