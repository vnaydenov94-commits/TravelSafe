
import { PrismaClient, LocationSharingLevel } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { VEHICLE_TYPE_IDS } from '../lib/vehicle-types'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create test user with admin privileges (mandatory test account)
  const hashedPassword = await bcrypt.hash('johndoe123', 12)
  
  const testUser = await prisma.user.create({
    data: {
      email: 'john@doe.com',
      password: hashedPassword,
      name: 'John Doe',
      profile: {
        create: {
          firstName: 'John',
          lastName: 'Doe',
          bio: 'Test admin account for TravelSafe',
          nationality: 'United States',
          homeCountry: 'United States',
          currentCountry: 'United States',
          currentCity: 'San Francisco',
          phoneNumber: '+1234567890',
          languages: ['English'],
          interests: ['technology', 'travel', 'photography'],
          travelStyle: 'business',
          vehicleType: 'car',
          isVerified: true,
          locationSharing: LocationSharingLevel.ALWAYS
        }
      }
    },
    include: { profile: true }
  })

  // Create additional test travelers (global + Bulgarian)
  const travelers = [
    // Existing global travelers
    {
      email: 'alice.wanderer@email.com',
      name: 'Alice Wanderer',
      profile: {
        firstName: 'Alice',
        lastName: 'Wanderer',
        bio: 'Digital nomad exploring the world one country at a time',
        nationality: 'Canada',
        homeCountry: 'Canada',
        currentCountry: 'Thailand',
        currentCity: 'Bangkok',
        phoneNumber: '+1987654321',
        languages: ['English', 'French'],
        interests: ['backpacking', 'photography', 'food'],
        travelStyle: 'backpacker',
        vehicleType: 'bicycle',
        locationSharing: LocationSharingLevel.CONNECTIONS_ONLY
      }
    },
    {
      email: 'marco.explorer@email.com',
      name: 'Marco Explorer',
      profile: {
        firstName: 'Marco',
        lastName: 'Explorer',
        bio: 'Adventure seeker and mountain climber',
        nationality: 'Italy',
        homeCountry: 'Italy',
        currentCountry: 'Nepal',
        currentCity: 'Kathmandu',
        phoneNumber: '+39123456789',
        languages: ['Italian', 'English', 'Spanish'],
        interests: ['hiking', 'climbing', 'adventure'],
        travelStyle: 'backpacker',
        vehicleType: 'motorcycle',
        locationSharing: LocationSharingLevel.CONNECTIONS_ONLY
      }
    },
    {
      email: 'yuki.traveler@email.com',
      name: 'Yuki Traveler',
      profile: {
        firstName: 'Yuki',
        lastName: 'Traveler',
        bio: 'Cultural enthusiast and language learner',
        nationality: 'Japan',
        homeCountry: 'Japan',
        currentCountry: 'France',
        currentCity: 'Paris',
        phoneNumber: '+81987654321',
        languages: ['Japanese', 'English', 'French'],
        interests: ['culture', 'art', 'language'],
        travelStyle: 'cultural',
        vehicleType: 'bus',
        locationSharing: LocationSharingLevel.ALWAYS
      }
    },
    // New Bulgarian travelers
    {
      email: 'dimitar.petrov@email.com',
      name: 'Dimitar Petrov',
      profile: {
        firstName: 'Dimitar',
        lastName: 'Petrov',
        bio: 'Sofia native and business traveler exploring Eastern Europe',
        nationality: 'Bulgaria',
        homeCountry: 'Bulgaria',
        currentCountry: 'Bulgaria',
        currentCity: 'Sofia',
        phoneNumber: '+359888123456',
        languages: ['Bulgarian', 'English', 'German'],
        interests: ['business', 'history', 'technology'],
        travelStyle: 'business',
        vehicleType: 'car',
        isVerified: true,
        locationSharing: LocationSharingLevel.ALWAYS
      }
    },
    {
      email: 'elena.ivanova@email.com',
      name: 'Elena Ivanova',
      profile: {
        firstName: 'Elena',
        lastName: 'Ivanova',
        bio: 'Truck driver delivering goods across the Balkans',
        nationality: 'Bulgaria',
        homeCountry: 'Bulgaria',
        currentCountry: 'Bulgaria',
        currentCity: 'Plovdiv',
        phoneNumber: '+359888234567',
        languages: ['Bulgarian', 'English', 'Serbian'],
        interests: ['logistics', 'travel', 'music'],
        travelStyle: 'business',
        vehicleType: 'truck',
        isVerified: true,
        locationSharing: LocationSharingLevel.CONNECTIONS_ONLY
      }
    },
    {
      email: 'viktor.georgiev@email.com',
      name: 'Viktor Georgiev',
      profile: {
        firstName: 'Viktor',
        lastName: 'Georgiev',
        bio: 'Motorcycle enthusiast touring the Black Sea coast',
        nationality: 'Bulgaria',
        homeCountry: 'Bulgaria',
        currentCountry: 'Bulgaria',
        currentCity: 'Varna',
        phoneNumber: '+359888345678',
        languages: ['Bulgarian', 'English', 'Russian'],
        interests: ['motorcycles', 'seaside', 'adventure'],
        travelStyle: 'adventure',
        vehicleType: 'motorcycle',
        isVerified: true,
        locationSharing: LocationSharingLevel.ALWAYS
      }
    },
    {
      email: 'maria.dimitrova@email.com',
      name: 'Maria Dimitrova',
      profile: {
        firstName: 'Maria',
        lastName: 'Dimitrova',
        bio: 'Tour guide leading RV expeditions through Bulgaria',
        nationality: 'Bulgaria',
        homeCountry: 'Bulgaria',
        currentCountry: 'Bulgaria',
        currentCity: 'Burgas',
        phoneNumber: '+359888456789',
        languages: ['Bulgarian', 'English', 'French', 'Italian'],
        interests: ['tourism', 'nature', 'photography'],
        travelStyle: 'leisure',
        vehicleType: 'camper_rv',
        isVerified: true,
        locationSharing: LocationSharingLevel.ALWAYS
      }
    },
    {
      email: 'georgi.stoev@email.com',
      name: 'Georgi Stoev',
      profile: {
        firstName: 'Georgi',
        lastName: 'Stoev',
        bio: 'Bus driver connecting Danube cities',
        nationality: 'Bulgaria',
        homeCountry: 'Bulgaria',
        currentCountry: 'Bulgaria',
        currentCity: 'Ruse',
        phoneNumber: '+359888567890',
        languages: ['Bulgarian', 'Romanian', 'English'],
        interests: ['public transport', 'Danube region', 'history'],
        travelStyle: 'business',
        vehicleType: 'bus',
        isVerified: true,
        locationSharing: LocationSharingLevel.CONNECTIONS_ONLY
      }
    },
    {
      email: 'petya.yankova@email.com',
      name: 'Petya Yankova',
      profile: {
        firstName: 'Petya',
        lastName: 'Yankova',
        bio: 'Cycling enthusiast exploring Bulgaria\'s ancient cities',
        nationality: 'Bulgaria',
        homeCountry: 'Bulgaria',
        currentCountry: 'Bulgaria',
        currentCity: 'Stara Zagora',
        phoneNumber: '+359888678901',
        languages: ['Bulgarian', 'English', 'Greek'],
        interests: ['cycling', 'archaeology', 'fitness'],
        travelStyle: 'adventure',
        vehicleType: 'bicycle',
        isVerified: true,
        locationSharing: LocationSharingLevel.ALWAYS
      }
    }
  ]

  const createdUsers = []
  for (const traveler of travelers) {
    const hashedTravelerPassword = await bcrypt.hash('password123', 12)
    const user = await prisma.user.create({
      data: {
        email: traveler.email,
        password: hashedTravelerPassword,
        name: traveler.name,
        profile: {
          create: traveler.profile
        }
      },
      include: { profile: true }
    })
    createdUsers.push(user)
  }

  // Create sample locations for travelers (global + Bulgarian)
  await prisma.location.createMany({
    data: [
      // John Doe - San Francisco
      {
        userId: testUser.id,
        latitude: 37.7749,
        longitude: -122.4194,
        address: 'San Francisco, CA, USA',
        city: 'San Francisco',
        country: 'United States',
        isCurrent: true
      },
      // Alice - Bangkok
      {
        userId: createdUsers[0].id,
        latitude: 13.7563,
        longitude: 100.5018,
        address: 'Bangkok, Thailand',
        city: 'Bangkok',
        country: 'Thailand',
        isCurrent: true
      },
      // Marco - Kathmandu
      {
        userId: createdUsers[1].id,
        latitude: 27.7172,
        longitude: 85.3240,
        address: 'Kathmandu, Nepal',
        city: 'Kathmandu',
        country: 'Nepal',
        isCurrent: true
      },
      // Yuki - Paris
      {
        userId: createdUsers[2].id,
        latitude: 48.8566,
        longitude: 2.3522,
        address: 'Paris, France',
        city: 'Paris',
        country: 'France',
        isCurrent: true
      },
      // Dimitar - Sofia, Bulgaria
      {
        userId: createdUsers[3].id,
        latitude: 42.6977,
        longitude: 23.3219,
        address: 'Sofia, Bulgaria',
        city: 'Sofia',
        country: 'Bulgaria',
        isCurrent: true
      },
      // Elena - Plovdiv, Bulgaria
      {
        userId: createdUsers[4].id,
        latitude: 42.1354,
        longitude: 24.7453,
        address: 'Plovdiv, Bulgaria',
        city: 'Plovdiv',
        country: 'Bulgaria',
        isCurrent: true
      },
      // Viktor - Varna, Bulgaria
      {
        userId: createdUsers[5].id,
        latitude: 43.2141,
        longitude: 27.9147,
        address: 'Varna, Bulgaria',
        city: 'Varna',
        country: 'Bulgaria',
        isCurrent: true
      },
      // Maria - Burgas, Bulgaria
      {
        userId: createdUsers[6].id,
        latitude: 42.5048,
        longitude: 27.4626,
        address: 'Burgas, Bulgaria',
        city: 'Burgas',
        country: 'Bulgaria',
        isCurrent: true
      },
      // Georgi - Ruse, Bulgaria
      {
        userId: createdUsers[7].id,
        latitude: 43.8564,
        longitude: 25.9707,
        address: 'Ruse, Bulgaria',
        city: 'Ruse',
        country: 'Bulgaria',
        isCurrent: true
      },
      // Petya - Stara Zagora, Bulgaria
      {
        userId: createdUsers[8].id,
        latitude: 42.4258,
        longitude: 25.6347,
        address: 'Stara Zagora, Bulgaria',
        city: 'Stara Zagora',
        country: 'Bulgaria',
        isCurrent: true
      }
    ]
  })

  // Create comprehensive connections between all travelers (global + Bulgarian)
  await prisma.connection.createMany({
    data: [
      // John (test user) connects to everyone (global + Bulgarian)
      {
        requesterId: testUser.id,
        receiverId: createdUsers[0].id, // Alice
        status: 'ACCEPTED'
      },
      {
        requesterId: testUser.id,
        receiverId: createdUsers[1].id, // Marco
        status: 'ACCEPTED'
      },
      {
        requesterId: testUser.id,
        receiverId: createdUsers[2].id, // Yuki
        status: 'ACCEPTED'
      },
      {
        requesterId: testUser.id,
        receiverId: createdUsers[3].id, // Dimitar
        status: 'ACCEPTED'
      },
      {
        requesterId: testUser.id,
        receiverId: createdUsers[4].id, // Elena
        status: 'ACCEPTED'
      },
      {
        requesterId: testUser.id,
        receiverId: createdUsers[5].id, // Viktor
        status: 'ACCEPTED'
      },
      {
        requesterId: testUser.id,
        receiverId: createdUsers[6].id, // Maria
        status: 'ACCEPTED'
      },
      {
        requesterId: testUser.id,
        receiverId: createdUsers[7].id, // Georgi
        status: 'ACCEPTED'
      },
      {
        requesterId: testUser.id,
        receiverId: createdUsers[8].id, // Petya
        status: 'ACCEPTED'
      },
      
      // Global travelers connect to each other
      {
        requesterId: createdUsers[0].id, // Alice
        receiverId: createdUsers[1].id, // Marco
        status: 'ACCEPTED'
      },
      {
        requesterId: createdUsers[0].id, // Alice
        receiverId: createdUsers[2].id, // Yuki
        status: 'ACCEPTED'
      },
      {
        requesterId: createdUsers[1].id, // Marco
        receiverId: createdUsers[2].id, // Yuki
        status: 'ACCEPTED'
      },
      
      // Bulgarian travelers connect to each other (forming Bulgarian network)
      {
        requesterId: createdUsers[3].id, // Dimitar (Sofia)
        receiverId: createdUsers[4].id, // Elena (Plovdiv)
        status: 'ACCEPTED'
      },
      {
        requesterId: createdUsers[3].id, // Dimitar (Sofia)
        receiverId: createdUsers[5].id, // Viktor (Varna)
        status: 'ACCEPTED'
      },
      {
        requesterId: createdUsers[3].id, // Dimitar (Sofia)
        receiverId: createdUsers[6].id, // Maria (Burgas)
        status: 'ACCEPTED'
      },
      {
        requesterId: createdUsers[4].id, // Elena (Plovdiv)
        receiverId: createdUsers[5].id, // Viktor (Varna)
        status: 'ACCEPTED'
      },
      {
        requesterId: createdUsers[4].id, // Elena (Plovdiv)
        receiverId: createdUsers[8].id, // Petya (Stara Zagora)
        status: 'ACCEPTED'
      },
      {
        requesterId: createdUsers[5].id, // Viktor (Varna)
        receiverId: createdUsers[6].id, // Maria (Burgas)
        status: 'ACCEPTED'
      },
      {
        requesterId: createdUsers[6].id, // Maria (Burgas)
        receiverId: createdUsers[7].id, // Georgi (Ruse)
        status: 'ACCEPTED'
      },
      {
        requesterId: createdUsers[7].id, // Georgi (Ruse)
        receiverId: createdUsers[8].id, // Petya (Stara Zagora)
        status: 'ACCEPTED'
      },
      
      // Cross-connections: Global travelers connect to some Bulgarian travelers
      {
        requesterId: createdUsers[0].id, // Alice
        receiverId: createdUsers[3].id, // Dimitar (Sofia)
        status: 'ACCEPTED'
      },
      {
        requesterId: createdUsers[1].id, // Marco
        receiverId: createdUsers[5].id, // Viktor (Varna)
        status: 'ACCEPTED'
      },
      {
        requesterId: createdUsers[2].id, // Yuki
        receiverId: createdUsers[6].id, // Maria (Burgas)
        status: 'ACCEPTED'
      }
    ]
  })

  // Create sample emergency contacts (global + Bulgarian)
  await prisma.emergencyContact.createMany({
    data: [
      {
        userId: testUser.id,
        name: 'Jane Doe',
        phoneNumber: '+1234567891',
        relationship: 'Spouse',
        email: 'jane.doe@email.com',
        isPrimary: true
      },
      {
        userId: createdUsers[0].id,
        name: 'Bob Wanderer',
        phoneNumber: '+1987654322',
        relationship: 'Brother',
        email: 'bob.wanderer@email.com',
        isPrimary: true
      },
      // Bulgarian emergency contacts
      {
        userId: createdUsers[3].id, // Dimitar
        name: 'Anna Petrova',
        phoneNumber: '+359888111222',
        relationship: 'Wife',
        email: 'anna.petrova@email.bg',
        isPrimary: true
      },
      {
        userId: createdUsers[4].id, // Elena
        name: 'Ivan Ivanov',
        phoneNumber: '+359888333444',
        relationship: 'Husband',
        email: 'ivan.ivanov@email.bg',
        isPrimary: true
      },
      {
        userId: createdUsers[5].id, // Viktor
        name: 'Svetlana Georgieva',
        phoneNumber: '+359888555666',
        relationship: 'Sister',
        email: 'svetlana.georgieva@email.bg',
        isPrimary: true
      }
    ]
  })

  // Create sample check-ins (global + Bulgarian)
  await prisma.checkIn.createMany({
    data: [
      {
        userId: testUser.id,
        status: 'SAFE',
        message: 'All good in San Francisco!',
        latitude: 37.7749,
        longitude: -122.4194,
        location: 'San Francisco, CA'
      },
      {
        userId: createdUsers[0].id,
        status: 'SAFE',
        message: 'Exploring Bangkok safely',
        latitude: 13.7563,
        longitude: 100.5018,
        location: 'Bangkok, Thailand'
      },
      // Bulgarian check-ins
      {
        userId: createdUsers[3].id, // Dimitar
        status: 'SAFE',
        message: 'Business meetings going well in Sofia!',
        latitude: 42.6977,
        longitude: 23.3219,
        location: 'Sofia, Bulgaria'
      },
      {
        userId: createdUsers[4].id, // Elena
        status: 'SAFE',
        message: 'Truck delivery completed successfully in Plovdiv',
        latitude: 42.1354,
        longitude: 24.7453,
        location: 'Plovdiv, Bulgaria'
      },
      {
        userId: createdUsers[5].id, // Viktor
        status: 'SAFE',
        message: 'Enjoying the Black Sea coast on my motorcycle!',
        latitude: 43.2141,
        longitude: 27.9147,
        location: 'Varna, Bulgaria'
      },
      {
        userId: createdUsers[6].id, // Maria
        status: 'SAFE',
        message: 'RV camping by the beach, everything perfect!',
        latitude: 42.5048,
        longitude: 27.4626,
        location: 'Burgas, Bulgaria'
      }
    ]
  })

  // Create sample local emergency resources (global + Bulgarian)
  await prisma.localEmergencyResource.createMany({
    data: [
      // Existing global resources
      {
        country: 'United States',
        city: 'San Francisco',
        serviceType: 'police',
        name: 'San Francisco Police Department',
        phoneNumber: '911',
        description: 'Emergency police services'
      },
      {
        country: 'Thailand',
        city: 'Bangkok',
        serviceType: 'police',
        name: 'Tourist Police',
        phoneNumber: '1155',
        description: 'Tourist assistance and emergency services'
      },
      {
        country: 'Thailand',
        city: 'Bangkok',
        serviceType: 'medical',
        name: 'Emergency Medical Services',
        phoneNumber: '1669',
        description: 'Medical emergency services'
      },
      {
        country: 'Nepal',
        city: 'Kathmandu',
        serviceType: 'police',
        name: 'Nepal Police',
        phoneNumber: '100',
        description: 'Emergency police services'
      },
      {
        country: 'France',
        city: 'Paris',
        serviceType: 'police',
        name: 'Police Nationale',
        phoneNumber: '17',
        description: 'Emergency police services'
      },
      
      // Bulgarian emergency resources
      {
        country: 'Bulgaria',
        city: 'Sofia',
        serviceType: 'police',
        name: 'Bulgarian National Police',
        phoneNumber: '112',
        description: 'Emergency police services in Sofia'
      },
      {
        country: 'Bulgaria',
        city: 'Sofia',
        serviceType: 'medical',
        name: 'Emergency Medical Services',
        phoneNumber: '112',
        description: 'Medical emergency services in Sofia'
      },
      {
        country: 'Bulgaria',
        city: 'Sofia',
        serviceType: 'fire',
        name: 'Fire Department Sofia',
        phoneNumber: '112',
        description: 'Fire and rescue services in Sofia'
      },
      {
        country: 'Bulgaria',
        city: 'Plovdiv',
        serviceType: 'police',
        name: 'Plovdiv Police Department',
        phoneNumber: '112',
        description: 'Emergency police services in Plovdiv'
      },
      {
        country: 'Bulgaria',
        city: 'Plovdiv',
        serviceType: 'medical',
        name: 'Plovdiv Emergency Medical Center',
        phoneNumber: '112',
        description: 'Medical emergency services in Plovdiv'
      },
      {
        country: 'Bulgaria',
        city: 'Varna',
        serviceType: 'police',
        name: 'Varna Police Department',
        phoneNumber: '112',
        description: 'Emergency police services in Varna'
      },
      {
        country: 'Bulgaria',
        city: 'Varna',
        serviceType: 'medical',
        name: 'Varna Medical Emergency Services',
        phoneNumber: '112',
        description: 'Medical emergency services in Varna'
      },
      {
        country: 'Bulgaria',
        city: 'Varna',
        serviceType: 'coast_guard',
        name: 'Black Sea Coast Guard',
        phoneNumber: '112',
        description: 'Maritime rescue and emergency services'
      },
      {
        country: 'Bulgaria',
        city: 'Burgas',
        serviceType: 'police',
        name: 'Burgas Police Department',
        phoneNumber: '112',
        description: 'Emergency police services in Burgas'
      },
      {
        country: 'Bulgaria',
        city: 'Burgas',
        serviceType: 'coast_guard',
        name: 'Burgas Port Authority',
        phoneNumber: '112',
        description: 'Port security and maritime emergency services'
      },
      {
        country: 'Bulgaria',
        city: 'Ruse',
        serviceType: 'police',
        name: 'Ruse Police Department',
        phoneNumber: '112',
        description: 'Emergency police services in Ruse'
      },
      {
        country: 'Bulgaria',
        city: 'Ruse',
        serviceType: 'border_control',
        name: 'Ruse Border Police',
        phoneNumber: '112',
        description: 'Border security and emergency services'
      },
      {
        country: 'Bulgaria',
        city: 'Stara Zagora',
        serviceType: 'police',
        name: 'Stara Zagora Police Department',
        phoneNumber: '112',
        description: 'Emergency police services in Stara Zagora'
      }
    ]
  })

  console.log('✅ Seed completed successfully!')
  console.log(`👤 Created ${createdUsers.length + 1} users (${1 + 3} global + ${6} Bulgarian travelers)`)
  console.log('📍 Added sample locations (global + Bulgarian cities)')
  console.log('🔗 Created comprehensive connections between all travelers')
  console.log('🚨 Added emergency contacts and Bulgarian emergency resources')
  console.log('✅ Added safety check-ins from multiple locations')
  console.log('🇧🇬 Bulgarian cities: Sofia, Plovdiv, Varna, Burgas, Ruse, Stara Zagora')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
